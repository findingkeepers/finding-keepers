'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const router = useRouter();

  const [hkidNumber, setHkidNumber] = useState('');
  const [hkidFile, setHkidFile] = useState<File | null>(null);
  const [paymentFile, setPaymentFile] = useState<File | null>(null);

  useEffect(() => {
    const checkVerification = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('verification_status')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.verification_status === 'verified') {
        setIsVerified(true);
      }
      setLoading(false);
    };

    checkVerification();
  }, [router]);

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hkidNumber || !hkidFile || !paymentFile) {
      toast.error("Please fill all fields and upload both files");
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      // === Ensure profile exists (Fix for foreign key error) ===
      await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || '',
        gender: user.user_metadata?.gender || 'male',
        verification_status: 'unverified'
      }, {
        onConflict: 'id'
      });

      // Upload HKID file
      const hkidPath = `${user.id}/hkid_${Date.now()}`;
      const { error: hkidError } = await supabase.storage
        .from('verifications')
        .upload(hkidPath, hkidFile);

      if (hkidError) throw hkidError;

      // Upload Payment Proof
      const paymentPath = `${user.id}/payment_${Date.now()}`;
      const { error: paymentError } = await supabase.storage
        .from('verifications')
        .upload(paymentPath, paymentFile);

      if (paymentError) throw paymentError;

      // Insert verification request
      const { error: insertError } = await supabase
        .from('verification_requests')
        .insert({
          user_id: user.id,
          hkid_number: hkidNumber,
          hkid_image_path: hkidPath,
          payment_proof_path: paymentPath,
          status: 'pending'
        });

      if (insertError) throw insertError;

      toast.success("Verification submitted successfully!");
      setSubmitted(true);

    } catch (error: any) {
      console.error("Verification error:", error);
      toast.error(error.message || "Failed to submit verification");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  if (!isVerified) {
    return (
      <div className="max-w-3xl mx-auto p-8">
        <h1 className="text-4xl font-bold mb-6">Welcome to Finding Keepers</h1>

        <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-2xl mb-8">
          <h2 className="text-2xl font-semibold mb-4">Account Verification Required</h2>

          <div className="bg-gray-200 h-64 flex items-center justify-center rounded-xl mb-6">
            <p className="text-gray-600">📹 Video Tutorial (Coming Soon)</p>
          </div>

          <h3 className="font-semibold mb-3 text-lg">How to Verify Your Account:</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Enter your HKID number</li>
            <li>Upload a clear photo/scan of your HKID</li>
            <li>Upload payment proof (Bank transfer / FPS / Alipay receipt)</li>
            <li>Wait for admin approval (usually within 24-48 hours)</li>
          </ol>
        </div>

        {!submitted ? (
          <div className="bg-white p-8 rounded-2xl shadow">
            <h2 className="text-2xl font-semibold mb-6">Complete Your Verification</h2>

            <form onSubmit={handleVerificationSubmit} className="space-y-6">
              <div>
                <Label>HKID Number</Label>
                <Input
                  value={hkidNumber}
                  onChange={(e) => setHkidNumber(e.target.value)}
                  placeholder="A123456(7)"
                  required
                />
              </div>

              <div>
                <Label>Upload HKID Photo/Scan</Label>
                <Input
                  type="file"
                  onChange={(e) => setHkidFile(e.target.files?.[0] || null)}
                  accept=".jpg,.jpeg,.png,.pdf"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Accepted: JPG, PNG, PDF (Max 5MB)</p>
              </div>

              <div>
                <Label>Upload Payment Proof</Label>
                <Input
                  type="file"
                  onChange={(e) => setPaymentFile(e.target.files?.[0] || null)}
                  accept=".jpg,.jpeg,.png,.pdf"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Bank transfer / FPS / Alipay receipt (Max 5MB)</p>
              </div>

              <Button type="submit" className="w-full h-12 text-lg" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit for Verification"}
              </Button>
            </form>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 p-6 rounded-2xl text-center">
            <h3 className="text-2xl font-semibold text-green-700 mb-2">Verification Submitted!</h3>
            <p className="text-green-600">Thank you. Our admin team will review your documents soon.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-4xl font-bold mb-2">Welcome to Finding Keepers</h1>
      <p className="text-gray-600 mb-8">You are verified.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow">
          <h2 className="text-2xl font-semibold mb-3">CV Builder</h2>
          <p className="text-gray-600 mb-4">Create or edit your marriage profile.</p>
          <Button className="w-full">Go to CV Builder</Button>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow">
          <h2 className="text-2xl font-semibold mb-3">Browse Profiles</h2>
          <p className="text-gray-600 mb-4">View profiles of the opposite gender.</p>
          <Button className="w-full">Browse CVs</Button>
        </div>
      </div>
    </div>
  );
}