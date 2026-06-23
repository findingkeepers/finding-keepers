'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface MatchRequest {
  id: string;
  male_short_id: string;
  female_short_id: string;
  male_name: string;
  female_name: string;
  status: string;
  created_at: string;
}

export default function MyMatchRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<MatchRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: myCV } = await supabase
        .from('cvs')
        .select('short_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!myCV?.short_id) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('match_requests')
        .select('*')
        .or(`male_short_id.eq.${myCV.short_id},female_short_id.eq.${myCV.short_id}`)
        .order('created_at', { ascending: false });

      if (!error) {
        setRequests(data || []);
      }

      setLoading(false);
    };

    fetchRequests();
  }, [router]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Match Requests</h1>
        <Button variant="outline" onClick={() => router.push('/dashboard')}>
          ← Back to Dashboard
        </Button>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-8 text-center">
          <p className="text-gray-600">You haven't sent any match requests yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4 text-left">Date</th>
                <th className="p-4 text-left">Profile</th>
                <th className="p-4 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => {
                const isMale = req.male_short_id === requests[0]?.male_short_id; // simplistic
                return (
                  <tr key={req.id} className="border-t">
                    <td className="p-4">{new Date(req.created_at).toLocaleDateString()}</td>
                    <td className="p-4">
                      {req.male_short_id} → {req.female_short_id}<br />
                      <span className="text-sm text-gray-500">{req.male_name} & {req.female_name}</span>
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded text-xs ${req.status === 'pending' ? 'bg-yellow-100' : 'bg-green-100'}`}>
                        {req.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}