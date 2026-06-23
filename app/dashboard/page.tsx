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
  const [hasCompletedCV, setHasCompletedCV] = useState(false);
  const [userName, setUserName] = useState('');

  // Check verification + user name
  useEffect(() => {
    const checkVerification = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, verification_status')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.full_name) setUserName(profile.full_name);
      if (profile?.verification_status === 'verified') setIsVerified(true);

      setLoading(false);
    };

    checkVerification();
  }, [router]);

  // Check if user has submitted a CV
  useEffect(() => {
    const checkCVCompletion = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: cvData } = await supabase
        .from('cvs')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      setHasCompletedCV(!!cvData);
    };

    if (isVerified) checkCVCompletion();
  }, [isVerified]);

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

      await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || '',
        gender: user.user_metadata?.gender || 'male',
        verification_status: 'unverified'
      }, { onConflict: 'id' });

      const hkidPath = `${user.id}/hkid_${Date.now()}`;
      const { error: hkidError } = await supabase.storage.from('verifications').upload(hkidPath, hkidFile);
      if (hkidError) throw hkidError;

      const paymentPath = `${user.id}/payment_${Date.now()}`;
      const { error: paymentError } = await supabase.storage.from('verifications').upload(paymentPath, paymentFile);
      if (paymentError) throw paymentError;

      const { error: insertError } = await supabase.from('verification_requests').insert({
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
      toast.error(error.message || "Failed to submit verification");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleDeleteCV = async () => {
    if (!confirm("Are you sure you want to delete your CV?")) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Clear localStorage
      localStorage.removeItem('cv_form_data');
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('match_request_')) localStorage.removeItem(key);
      });

      const { data: existingCV } = await supabase.from('cvs').select('photo_url').eq('user_id', user.id).maybeSingle();

      if (existingCV?.photo_url) {
        const urlParts = existingCV.photo_url.split('/profile-photos/');
        if (urlParts.length > 1) {
          await supabase.storage.from('profile-photos').remove([`profile-photos/${urlParts[1]}`]);
        }
      }

      await supabase.from('cvs').delete().eq('user_id', user.id);
      setHasCompletedCV(false);
      toast.success("CV deleted successfully");
    } catch (error) {
      toast.error("Failed to delete CV");
    }
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  // ==================== UNVERIFIED USER ====================
  if (!isVerified) {
    return (
      <div className="max-w-3xl mx-auto p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Welcome to Finding Keepers</h1>
          <Button variant="outline" onClick={handleLogout}>Logout</Button>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-2xl mb-8">
          <h2 className="text-2xl font-semibold mb-4">Account Verification Required</h2>
          <div className="bg-gray-200 h-64 flex items-center justify-center rounded-xl mb-6">
            <p className="text-gray-600">📹 Video Tutorial (Coming Soon)</p>
          </div>
          <h3 className="font-semibold mb-3">How to Verify:</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Enter your HKID number</li>
            <li>Upload a clear photo/scan of your HKID</li>
            <li>Upload payment proof</li>
            <li>Wait for admin approval (24-48 hours)</li>
          </ol>
        </div>

        {!submitted ? (
          <div className="bg-white p-8 rounded-2xl shadow">
            <h2 className="text-2xl font-semibold mb-6">Complete Your Verification</h2>
            <form onSubmit={handleVerificationSubmit} className="space-y-6">
              <div>
                <Label>HKID Number</Label>
                <Input value={hkidNumber} onChange={(e) => setHkidNumber(e.target.value)} placeholder="A123456(7)" required />
              </div>
              <div>
                <Label>Upload HKID Photo/Scan</Label>
                <Input type="file" onChange={(e) => setHkidFile(e.target.files?.[0] || null)} accept=".jpg,.jpeg,.png,.pdf" required />
              </div>
              <div>
                <Label>Upload Payment Proof</Label>
                <Input type="file" onChange={(e) => setPaymentFile(e.target.files?.[0] || null)} accept=".jpg,.jpeg,.png,.pdf" required />
              </div>
              <Button type="submit" className="w-full h-12" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit for Verification"}
              </Button>
            </form>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 p-6 rounded-2xl text-center">
            <h3 className="text-2xl font-semibold text-green-700 mb-2">Verification Submitted!</h3>
            <p className="text-green-600">Our admin team will review your documents soon.</p>
          </div>
        )}
      </div>
    );
  }

  // ==================== VERIFIED USER ====================
  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Welcome to Finding Keepers</h1>
          <p className="text-gray-600">You are verified.</p>
        </div>
        <Button variant="outline" onClick={handleLogout}>Logout</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CV Management Card */}
        <div className="bg-white p-6 rounded-2xl shadow">
          <h2 className="text-2xl font-semibold mb-2">
            {hasCompletedCV ? "Manage Your CV" : "CV Builder"}
          </h2>
          <p className="text-gray-600 mb-6">
            {hasCompletedCV ? "View, edit or delete your marriage profile." : "Create your marriage profile."}
          </p>

          <div className="flex flex-col gap-3">
            {hasCompletedCV ? (
              <>
                <Button onClick={() => router.push('/dashboard/my-cv')}>View My CV</Button>
                <Button variant="outline" onClick={() => router.push('/dashboard/my-match-requests')}>
                  My Match Requests
                </Button>
                <Button variant="outline" onClick={() => router.push('/dashboard/cv-builder')}>
                  Edit CV
                </Button>
                <Button variant="destructive" onClick={handleDeleteCV}>
                  Delete CV
                </Button>
              </>
            ) : (
              <Button onClick={() => router.push('/dashboard/cv-builder')}>
                Go to CV Builder
              </Button>
            )}
          </div>
        </div>

        {/* Browse Profiles Card */}
        <div className="bg-white p-6 rounded-2xl shadow">
          <h2 className="text-2xl font-semibold mb-2">Browse Profiles</h2>
          <p className="text-gray-600 mb-6">View profiles of the opposite gender.</p>

          {hasCompletedCV ? (
            <Button onClick={() => router.push('/browse')} className="w-full">
              Browse CVs
            </Button>
          ) : (
            <div>
              <Button disabled className="w-full bg-gray-400 cursor-not-allowed">
                Browse CVs
              </Button>
              <p className="text-sm text-red-500 mt-2">
                Please complete your CV first to browse other profiles.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}