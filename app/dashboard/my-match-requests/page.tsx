'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';
import { EmptyState } from '@/components/layout/EmptyState';
import { DataTable, DataTableHead, DataTableRow, DataTableCell } from '@/components/layout/DataTable';
import { StatusBadge } from '@/components/ui/status-badge';
import { useDashboardMenu } from '@/components/dashboard/DashboardLayoutProvider';
import { MatchDirectionDisplay } from '@/components/match/MatchDirectionDisplay';

interface MatchRequest {
  id: string;
  male_short_id: string;
  female_short_id: string;
  requested_by_short_id?: string | null;
  status: string;
  created_at: string;
}

export default function MyMatchRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<MatchRequest[]>([]);
  const [myShortId, setMyShortId] = useState('');
  const [loading, setLoading] = useState(true);
  const { onMenuClick } = useDashboardMenu();

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

      setMyShortId(myCV.short_id);

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

  if (loading) return <LoadingSpinner message="Loading match requests..." />;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="My Match Requests"
        subtitle="Track the status of your match requests."
        onMenuClick={onMenuClick}
      />

      {requests.length === 0 ? (
        <EmptyState
          title="No Match Requests Yet"
          description="You haven't sent any match requests. Browse profiles to find your right fit."
        />
      ) : (
        <DataTable>
          <table className="w-full min-w-[600px]">
            <DataTableHead>
              <tr>
                <DataTableCell header>Date</DataTableCell>
                <DataTableCell header>Request</DataTableCell>
                <DataTableCell header>Status</DataTableCell>
              </tr>
            </DataTableHead>
            <tbody>
              {requests.map((req) => (
                <DataTableRow key={req.id}>
                  <DataTableCell>
                    {new Date(req.created_at).toLocaleDateString()}
                  </DataTableCell>
                  <DataTableCell>
                    <MatchDirectionDisplay
                      maleShortId={req.male_short_id}
                      femaleShortId={req.female_short_id}
                      requestedByShortId={req.requested_by_short_id}
                      highlightId={myShortId}
                    />
                  </DataTableCell>
                  <DataTableCell>
                    <StatusBadge status={req.status} />
                  </DataTableCell>
                </DataTableRow>
              ))}
            </tbody>
          </table>
        </DataTable>
      )}
    </div>
  );
}