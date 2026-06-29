'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { respondToMatchRequest } from '@/app/actions/match';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/PageHeader';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';
import { EmptyState } from '@/components/layout/EmptyState';
import { DataTable, DataTableHead, DataTableRow, DataTableCell } from '@/components/layout/DataTable';
import { StatusBadge } from '@/components/ui/status-badge';
import { useDashboardMenu } from '@/components/dashboard/DashboardLayoutProvider';
import { MatchDirectionDisplay } from '@/components/match/MatchDirectionDisplay';
import {
  getMatchDirection,
  isMatchRecipient,
  isMatchRequester,
} from '@/lib/match-request';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MatchRequest {
  id: string;
  male_short_id: string;
  female_short_id: string;
  requested_by_short_id?: string | null;
  status: string;
  created_at: string;
}

type TabKey = 'sent' | 'received';

export default function MyMatchRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<MatchRequest[]>([]);
  const [myShortId, setMyShortId] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('received');
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const { onMenuClick } = useDashboardMenu();

  const fetchRequests = useCallback(async () => {
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
  }, [router]);

  useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);

  const sentRequests = useMemo(
    () => requests.filter((req) => isMatchRequester(req, myShortId)),
    [requests, myShortId]
  );

  const receivedRequests = useMemo(
    () => requests.filter((req) => isMatchRecipient(req, myShortId)),
    [requests, myShortId]
  );

  const visibleRequests = activeTab === 'sent' ? sentRequests : receivedRequests;

  const handleRespond = async (
    requestId: string,
    decision: 'approve' | 'reject'
  ) => {
    setRespondingId(requestId);

    const result = await respondToMatchRequest({ requestId, decision });

    if (result.success) {
      toast.success(result.message);
      await fetchRequests();
    } else {
      toast.error(result.message || 'Could not update match request');
    }

    setRespondingId(null);
  };

  if (loading) return <LoadingSpinner message="Loading match requests..." />;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="My Match Requests"
        subtitle="Review requests you sent and received."
        onMenuClick={onMenuClick}
      />

      <div className="mb-6 flex gap-2 rounded-xl border border-fk-gold/20 bg-fk-cream/40 p-1">
        <button
          type="button"
          onClick={() => setActiveTab('received')}
          className={cn(
            'flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
            activeTab === 'received'
              ? 'bg-fk-plum text-fk-cream shadow-sm'
              : 'text-fk-body hover:bg-white/70'
          )}
        >
          Received ({receivedRequests.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('sent')}
          className={cn(
            'flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
            activeTab === 'sent'
              ? 'bg-fk-plum text-fk-cream shadow-sm'
              : 'text-fk-body hover:bg-white/70'
          )}
        >
          Sent ({sentRequests.length})
        </button>
      </div>

      {visibleRequests.length === 0 ? (
        <EmptyState
          title={activeTab === 'sent' ? 'No Sent Requests' : 'No Received Requests'}
          description={
            activeTab === 'sent'
              ? "You haven't sent any match requests yet. Browse profiles to find your right fit."
              : "You haven't received any match requests yet."
          }
        />
      ) : (
        <DataTable>
          <table className="w-full min-w-[720px]">
            <DataTableHead>
              <tr>
                <DataTableCell header>Date</DataTableCell>
                <DataTableCell header>Request</DataTableCell>
                <DataTableCell header>Status</DataTableCell>
                <DataTableCell header>Action</DataTableCell>
              </tr>
            </DataTableHead>
            <tbody>
              {visibleRequests.map((req) => {
                const { fromId } = getMatchDirection(req);
                const canRespond =
                  activeTab === 'received' && req.status === 'pending';

                return (
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
                    <DataTableCell>
                      {canRespond ? (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            asChild
                            variant="premium-outline"
                            size="sm"
                            className="rounded-lg"
                          >
                            <Link href={`/browse/${fromId}`}>View CV</Link>
                          </Button>
                          <Button
                            variant="premium"
                            size="sm"
                            className="rounded-lg"
                            disabled={respondingId === req.id}
                            onClick={() => handleRespond(req.id, 'approve')}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg"
                            disabled={respondingId === req.id}
                            onClick={() => handleRespond(req.id, 'reject')}
                          >
                            Decline
                          </Button>
                        </div>
                      ) : activeTab === 'sent' && req.status === 'pending' ? (
                        <span className="text-sm text-muted-foreground">
                          Awaiting response
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </DataTableCell>
                  </DataTableRow>
                );
              })}
            </tbody>
          </table>
        </DataTable>
      )}
    </div>
  );
}