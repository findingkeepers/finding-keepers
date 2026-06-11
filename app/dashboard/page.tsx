'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

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
        .single();

      if (profile?.verification_status === 'verified') {
        setIsVerified(true);
      }

      setLoading(false);
    };

    checkVerification();
  }, [router]);

  // Handle Verification Form Submission
  const handleVerificationSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const hkidNumber = formData.get('hkidNumber') as string;
    const hkidFile = formData.get('hkidFile') as File;
    const paymentFile = formData.get('paymentFile') as File;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      // Upload HKID file
      const hkidPath = `verifications/${user.id}/hkid_${Date.now()}`;
      const { error: hkidError } = await supabase.storage
        .from('verifications')
        .upload(hkidPath, hkidFile);

      if (hkidError) throw hkidError;

      // Upload Payment Proof
      const paymentPath = `verifications/${user.id}/payment_${Date.now()}`;
      const { error: paymentError } = await supabase.storage
        .from('verifications')
        .upload(paymentPath, paymentFile);

      if (paymentError) throw paymentError;

      // Save verification request to database
      const { error: insertError } = await supabase
        .from('verification_requests')
        .insert({
          user_id: user.id,
          hkid_number: hkidNumber,
          hkid_image_path: hkidPath,
          payment_proof_path: paymentPath,
          status: 'pending',
        });

      if (insertError) throw insertError;

      // Update user status to pending
      await supabase
        .from('profiles')
        .update({ verification_status: 'pending' })
        .eq('id', user.id);

      toast.success('Verification submitted successfully! Please wait for admin approval.');
      window.location.reload();

    } catch (error: any) {
      toast.error(error.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-10">Loading...</div>;
  }

  // ==================== UNVERIFIED USER ====================
  if (!isVerified) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-4xl font-bold mb-4">Welcome to Finding Keepers</h1>

        <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-xl mb-8">
          <h2 className="text-2xl font-semibold mb-3">Account Verification Required</h2>
          <p className="mb-4">
            To access CV Builder and browse other profiles, you need to complete verification first.
          </p>

          {/* Video Placeholder */}
          <div className="bg-gray-200 h-64 flex items-center justify-center rounded-lg mb-6">
            <p className="text-gray-600">📹 Video Tutorial (Coming Soon)</p>
          </div>

          <h3 className="font-semibold mb-2">How to Verify Your Account:</h3>
          <ol className="list-decimal list-inside space-y-1 mb-6">
            <li>Enter your HKID number</li>
            <li>Upload a clear photo/scan of your HKID</li>
            <li>Upload payment proof (Alipay / Bank transfer / FPS receipt)</li>
            <li>Wait for admin approval (usually within 24-48 hours)</li>
          </ol>
        </div>

        {/* Verification Form */}
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-2xl font-semibold mb-6">Complete Your Verification</h2>

          <form onSubmit={handleVerificationSubmit} className="space-y-6">
            {/* HKID Number */}
            <div>
              <label className="block text-sm font-medium mb-1">HKID Number</label>
              <input
                type="text"
                name="hkidNumber"
                placeholder="e.g. A123456(7)"
                className="w-full border rounded-lg p-3"
                required
              />
            </div>

            {/* Upload HKID */}
            <div>
              <label className="block text-sm font-medium mb-1">Upload HKID Photo/Scan</label>
              <input
                type="file"
                name="hkidFile"
                accept="image/*,.pdf"
                className="w-full border rounded-lg p-3 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-100"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Accepted: JPG, PNG, PDF (Max 5MB)</p>
            </div>

            {/* Upload Payment Proof */}
            <div>
              <label className="block text-sm font-medium mb-1">Upload Payment Proof</label>
              <input
                type="file"
                name="paymentFile"
                accept="image/*,.pdf"
                className="w-full border rounded-lg p-3 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-100"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Bank transfer / FPS / Alipay receipt (Max 5MB)</p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit for Verification"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ==================== VERIFIED USER ====================
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-2">Welcome to Finding Keepers</h1>
      <p className="text-gray-600 mb-8">You are verified. You can now build your CV and browse profiles.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-2xl font-semibold mb-3">CV Builder</h2>
          <p className="text-gray-600 mb-4">Create or edit your marriage profile/CV.</p>
          <button className="bg-black text-white px-6 py-2 rounded-lg">Go to CV Builder</button>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-2xl font-semibold mb-3">Browse Profiles</h2>
          <p className="text-gray-600 mb-4">View profiles of the opposite gender.</p>
          <button className="bg-black text-white px-6 py-2 rounded-lg">Browse CVs</button>
        </div>
      </div>
    </div>
  );
}