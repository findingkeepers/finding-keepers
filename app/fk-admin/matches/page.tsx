'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface MatchRequest {
  id: string;
  male_short_id: string;
  female_short_id: string;
  male_name: string;
  female_name: string;
  status: string;
  created_at: string;
}

export default function AdminMatchesPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<MatchRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<MatchRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchMatchRequests = async () => {
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
      router.push('/dashboard');
      return;
    }

    const { data, error } = await supabase
      .from('match_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRequests(data);
      setFilteredRequests(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMatchRequests();
  }, [router]);

  // Apply filters
  useEffect(() => {
    let result = requests;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (req) =>
          req.male_name?.toLowerCase().includes(term) ||
          req.female_name?.toLowerCase().includes(term) ||
          req.male_short_id?.toLowerCase().includes(term) ||
          req.female_short_id?.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((req) => req.status === statusFilter);
    }

    setFilteredRequests(result);
  }, [searchTerm, statusFilter, requests]);

  const updateStatus = async (id: string, newStatus: string) => {
  try {
    const { error } = await supabase
      .from('match_requests')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      console.error("Update error:", error);
      toast.error("Failed to update status. Check RLS policies.");
      return;
    }

    toast.success(`Status updated to ${newStatus}`);
    fetchMatchRequests(); // Refresh the list
  } catch (error) {
    console.error("Update error:", error);
    toast.error("Something went wrong while updating status");
  }
};

  if (loading) return <div className="p-8 text-center">Loading match requests...</div>;

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Match Requests</h1>
          <p className="text-gray-600">Total: {filteredRequests.length} / {requests.length}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchMatchRequests}>
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
          <label className="text-sm font-medium">Search</label>
          <Input
            placeholder="Search by name or Short ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Status</label>
          <select
            className="w-full border rounded-md p-2"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="contacted">Contacted</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
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
      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left p-4">Submitted</th>
              <th className="text-left p-4">Male (MID)</th>
              <th className="text-left p-4">Female (FID)</th>
              <th className="text-left p-4">Status</th>
              <th className="text-center p-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  No match requests found.
                </td>
              </tr>
            ) : (
              filteredRequests.map((req) => (
                <tr key={req.id} className="border-t hover:bg-gray-50">
                  <td className="p-4 text-sm">
                    {new Date(req.created_at).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <div>
                      <span className="font-mono font-bold">{req.male_short_id}</span>
                      <br />
                      <span className="text-sm text-gray-600">{req.male_name}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div>
                      <span className="font-mono font-bold">{req.female_short_id}</span>
                      <br />
                      <span className="text-sm text-gray-600">{req.female_name}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                      req.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      req.status === 'contacted' ? 'bg-blue-100 text-blue-700' :
                      req.status === 'completed' ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <select
                      value={req.status}
                      onChange={(e) => updateStatus(req.id, e.target.value)}
                      className="border rounded px-2 py-1 text-sm"
                    >
                      <option value="pending">Pending</option>
                      <option value="contacted">Contacted</option>
                      <option value="completed">Completed</option>
                      <option value="rejected">Rejected</option>
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