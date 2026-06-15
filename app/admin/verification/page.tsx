'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface VerificationRequest {
  id: string;
  submitted_at: string;
  hkid_number: string;
  status: string;
  hkid_image_path: string;
  payment_proof_path: string;
  user_id: string;
  profiles: {
    email: string;
    phone: string;
  };
}

export default function AdminVerifications() {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAdminAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile || profile.role !== 'admin') {
        toast.error("Access denied. Admin only.");
        router.push('/dashboard');
        return;
      }

      fetchRequests();
    };

    checkAdminAccess();
  }, [router]);

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from('verification_requests')
      .select(`
        id,
        submitted_at,
        hkid_number,
        status,
        hkid_image_path,
        payment_proof_path,
        user_id,
        profiles (email, phone)
      `)
      .order('submitted_at', { ascending: false });

    if (error) {
      toast.error("Failed to load data");
      console.error(error);
    } else {
      setRequests(data as any);
    }
    setLoading(false);
  };

  const updateStatus = async (id: string, newStatus: string, userId: string) => {
    try {
      await supabase
        .from('verification_requests')
        .update({ status: newStatus })
        .eq('id', id);

      let profileStatus = newStatus === 'verified' ? 'verified' : 
                         newStatus === 'invalidated' ? 'invalidated' : 'unverified';

      await supabase
        .from('profiles')
        .update({ verification_status: profileStatus })
        .eq('id', userId);

      toast.success(`Status updated to ${newStatus}`);
      fetchRequests();

    } catch (error: any) {
      toast.error(error.message || "Update failed");
    }
  };

  if (loading) return <div className="p-8">Loading admin panel...</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Admin - Verification Requests</h1>

      <div className="overflow-x-auto bg-white rounded-xl shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Submitted At</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Phone</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">HKID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">HKID Proof</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Payment Proof</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {requests.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  No verification requests found
                </td>
              </tr>
            ) : (
              requests.map((req) => (
                <tr key={req.id}>
                  <td className="px-4 py-3 text-sm">{new Date(req.submitted_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm">{req.profiles?.email}</td>
                  <td className="px-4 py-3 text-sm">{req.profiles?.phone}</td>
                  <td className="px-4 py-3 text-sm font-medium">{req.hkid_number}</td>
                  <td className="px-4 py-3 text-sm">
                    <a href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/verifications/${req.hkid_image_path}`} target="_blank" className="text-blue-600 hover:underline">View</a>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <a href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/verifications/${req.payment_proof_path}`} target="_blank" className="text-blue-600 hover:underline">View</a>
                  </td>
                  <td className="px-4 py-3">
                    <select 
                      value={req.status} 
                      onChange={(e) => updateStatus(req.id, e.target.value, req.user_id)}
                      className="border rounded px-2 py-1 text-sm"
                    >
                      <option value="pending">Pending</option>
                      <option value="verified">Verified</option>
                      <option value="invalidated">Invalidated</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}