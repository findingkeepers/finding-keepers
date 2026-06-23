'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    full_name: string;
    email: string;
    phone: string;
  };
}

export default function AdminVerifications() {
  const router = useRouter();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchRequests = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/fk-admin/login');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      toast.error("Access denied");
      router.push('/dashboard');
      return;
    }

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
        profiles (
          full_name,
          email,
          phone
        )
      `)
      .order('submitted_at', { ascending: false });

    if (!error && data) {
      setRequests(data as any);
      setFilteredRequests(data as any);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, [router]);

  // Apply filters
  useEffect(() => {
    let result = requests;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((req) =>
        req.profiles?.full_name?.toLowerCase().includes(term) ||
        req.profiles?.email?.toLowerCase().includes(term) ||
        req.profiles?.phone?.toLowerCase().includes(term) ||
        req.hkid_number?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((req) => req.status === statusFilter);
    }

    setFilteredRequests(result);
  }, [searchTerm, statusFilter, requests]);

  const updateStatus = async (id: string, newStatus: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('verification_requests')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      // Also update the user's profile status
      if (newStatus === 'verified') {
        await supabase
          .from('profiles')
          .update({ verification_status: 'verified' })
          .eq('id', userId);
      }

      toast.success(`Status updated to ${newStatus}`);
      fetchRequests();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  if (loading) return <div className="p-8 text-center">Loading verification requests...</div>;

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Verification Requests</h1>
          <p className="text-gray-600">Total: {filteredRequests.length}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchRequests}>
            Refresh
          </Button>
          <Button variant="outline" onClick={() => router.push('/fk-admin')}>
            ← Back to Dashboard
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Search</label>
          <Input
            placeholder="Search by name, email, phone or HKID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Status</label>
          <select
            className="w-full border rounded-md p-2"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="invalidated">Invalidated</option>
          </select>
        </div>

        <div className="flex items-end">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
            }}
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left p-4">Submitted</th>
              <th className="text-left p-4">Name</th>
              <th className="text-left p-4">Email</th>
              <th className="text-left p-4">Phone</th>
              <th className="text-left p-4">HKID</th>
              <th className="text-left p-4">Documents</th>
              <th className="text-left p-4">Status</th>
              <th className="text-center p-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-500">
                  No verification requests found.
                </td>
              </tr>
            ) : (
              filteredRequests.map((req) => (
                <tr key={req.id} className="border-t hover:bg-gray-50">
                  <td className="p-4 text-sm">
                    {new Date(req.submitted_at).toLocaleString()}
                  </td>
                  <td className="p-4 font-medium">{req.profiles?.full_name || 'N/A'}</td>
                  <td className="p-4 text-sm">{req.profiles?.email}</td>
                  <td className="p-4 text-sm">{req.profiles?.phone || 'N/A'}</td>
                  <td className="p-4 font-mono text-sm">{req.hkid_number}</td>
                  <td className="p-4 text-sm space-x-2">
                    <a 
                      href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/verifications/${req.hkid_image_path}`} 
                      target="_blank" 
                      className="text-blue-600 hover:underline"
                    >
                      HKID
                    </a>
                    <span className="text-gray-400">|</span>
                    <a 
                      href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/verifications/${req.payment_proof_path}`} 
                      target="_blank" 
                      className="text-blue-600 hover:underline"
                    >
                      Payment
                    </a>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                      req.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      req.status === 'verified' ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="p-4 text-center">
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