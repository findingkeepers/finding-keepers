'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { requireClientSession } from '@/lib/auth/require-client-session';
import { redirectToLogin } from '@/lib/auth/redirect-to-login';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/PageHeader';
import { BrowseProfileDetailSkeleton } from '@/components/browse/BrowseProfileDetailSkeleton';
import { EmptyState } from '@/components/layout/EmptyState';
import { CVField } from '@/components/cv/CVSectionCard';
import { BrowseProfileSections } from '@/components/cv/BrowseProfileSections';
import { toast } from 'sonner';
import { getBrowsableProfile } from '@/app/actions/browse';
import { expireStaleMatchRequests, requestMatch } from '@/app/actions/match';
import { showMatchResultToast } from '@/lib/match-notifications';
import {
  ACTIVE_MATCH_STATUSES,
  blocksNewRequestToPair,
  countsTowardActiveQuota,
  MAX_ACTIVE_MATCH_REQUESTS,
} from '@/lib/match-limits';
import { hasActiveIntroduction, MATCH_STATUS, normalizeMatchStatus } from '@/lib/match-status';
import {
  formatPendingExpiryHint,
  getEffectiveMatchStatus,
  isPendingExpired,
} from '@/lib/match-expiry';
import { isMatchRecipient, isMatchRequester } from '@/lib/match-request';
import { StatusBadge } from '@/components/ui/status-badge';
import { User } from 'lucide-react';


export default function ViewProfilePage() {
  const router = useRouter();
  const params = useParams();
  const short_id = params.short_id as string;

  const [cv, setCv] = useState<{ short_id: string; photo_url: string | null; data: Record<string, string> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [responding, setResponding] = useState(false);
  const [canRequestMatch, setCanRequestMatch] = useState(false);
  const [matchBlockedReason, setMatchBlockedReason] = useState<string | null>(null);
  const [requestSent, setRequestSent] = useState(false);
  const [pendingIncomingRequestId, setPendingIncomingRequestId] = useState<string | null>(null);
  const [pairMatchStatus, setPairMatchStatus] = useState<string | null>(null);
  const [pendingExpiryHint, setPendingExpiryHint] = useState<string | null>(null);

  useEffect(() => {
    const fetchCV = async () => {
      if (!short_id) return;

      const authed = await requireClientSession();
      if (!authed) {
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        redirectToLogin();
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select(
          'verification_status, browse_visible, active_introduction_request_id'
        )
        .eq('id', user.id)
        .single();

      if (hasActiveIntroduction(profile ?? {})) {
        setMatchBlockedReason(
          'You currently have an active introduction and cannot send new requests until it ends.'
        );
      }

      if (!profile || profile.verification_status !== 'verified') {
        router.push('/dashboard');
        return;
      }

      const browseResult = await getBrowsableProfile(short_id);
      if (!browseResult.ok) {
        setError(browseResult.message || 'Profile not found');
        setLoading(false);
        return;
      }

      const cvData = browseResult.cv;
      setCv(cvData);
      setCanRequestMatch(browseResult.canRequestMatch ?? false);

      if (!browseResult.canRequestMatch) {
        setLoading(false);
        return;
      }

      await expireStaleMatchRequests();

      try {
        const { data: currentUserCV } = await supabase
          .from('cvs')
          .select('short_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (currentUserCV?.short_id && cvData.short_id) {
          const current = currentUserCV.short_id;
          const viewed = cvData.short_id;

          const { data: existing } = await supabase
            .from('match_requests')
            .select(
              'id, status, created_at, requested_by_short_id, male_short_id, female_short_id'
            )
            .or(
              `and(male_short_id.eq.${current},female_short_id.eq.${viewed}),` +
              `and(male_short_id.eq.${viewed},female_short_id.eq.${current})`
            )
            .order('created_at', { ascending: false })
            .limit(1);

          const latestPairRequest = existing?.[0];

          if (latestPairRequest?.status === 'rejected') {
            setMatchBlockedReason(
              'This match request was declined and cannot be sent again.'
            );
          } else if (latestPairRequest) {
            const iAmRequester = isMatchRequester(latestPairRequest, current);
            const iAmRecipient = isMatchRecipient(latestPairRequest, current);
            const pairBlocksNewRequest = blocksNewRequestToPair(
              latestPairRequest.status,
              latestPairRequest.created_at
            );

            if (
              iAmRecipient &&
              latestPairRequest.status === 'pending' &&
              !isPendingExpired(latestPairRequest.created_at)
            ) {
              setPendingIncomingRequestId(latestPairRequest.id);
            } else if (iAmRequester && pairBlocksNewRequest) {
              setRequestSent(true);
              if (
                latestPairRequest.status === 'pending' &&
                !isPendingExpired(latestPairRequest.created_at)
              ) {
                setPendingExpiryHint(
                  formatPendingExpiryHint(latestPairRequest.created_at)
                );
              }
            } else if (iAmRecipient && pairBlocksNewRequest) {
              setPairMatchStatus(
                getEffectiveMatchStatus(
                  latestPairRequest.status,
                  latestPairRequest.created_at
                )
              );
            }
          }

          const { data: activeRequests } = await supabase
            .from('match_requests')
            .select('id, status, created_at')
            .eq('requested_by_short_id', current)
            .in('status', [...ACTIVE_MATCH_STATUSES]);

          const activeRequestCount =
            activeRequests?.filter((request) =>
              countsTowardActiveQuota(request.status, request.created_at)
            ).length ?? 0;

          const hasActiveRequestToThisProfile =
            latestPairRequest &&
            isMatchRequester(latestPairRequest, current) &&
            blocksNewRequestToPair(
              latestPairRequest.status,
              latestPairRequest.created_at
            );

          if (
            activeRequestCount >= MAX_ACTIVE_MATCH_REQUESTS &&
            !hasActiveRequestToThisProfile
          ) {
            setMatchBlockedReason(
              `You already have ${MAX_ACTIVE_MATCH_REQUESTS} active match requests. Wait for a response, rejection, or 7-day expiry before requesting another match.`
            );
          }
        }
      } catch (err) {
        console.error("Match request check error:", err);
      }

      setLoading(false);
    };

    fetchCV();
  }, [short_id, router]);

  const handleRespond = async (decision: 'approve' | 'reject') => {
    if (!pendingIncomingRequestId) return;

    setResponding(true);

    try {
      const response = await fetch('/api/match/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          requestId: pendingIncomingRequestId,
          decision,
        }),
      });

      const result = await response.json();

      if (result.success) {
        showMatchResultToast(
          result.message,
          'Match request updated successfully.'
        );
        setPendingIncomingRequestId(null);
        if (decision === 'reject') {
          setMatchBlockedReason(
            'This match request was declined and cannot be sent again.'
          );
        } else {
          setPairMatchStatus(MATCH_STATUS.interestReturned);
        }
      } else {
        toast.error(result.message || 'Could not update match request');
      }
    } catch {
      toast.error('Could not update match request. Please try again.');
    } finally {
      setResponding(false);
    }
  };

  const handleRequestMatch = async () => {
    if (
      !cv ||
      !canRequestMatch ||
      requestSent ||
      matchBlockedReason ||
      pendingIncomingRequestId
    ) {
      return;
    }

    setSending(true);

    try {
      const result = await requestMatch({
        profileShortId: short_id,
        profileName: cv.data?.fullName,
        profileGender: cv.data?.gender,
      });

      if (result.success) {
        showMatchResultToast(
          result.message,
          'Match request sent! They will be notified by email.'
        );
        setRequestSent(true);
        setMatchBlockedReason(null);
      } else {
        toast.error(result.message || "Failed to send request");
        if (
          result.message?.includes('declined') ||
          result.message?.includes('3 active')
        ) {
          setMatchBlockedReason(result.message);
        }
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-8 md:px-10">
        <PageHeader
          title="Profile Details"
          subtitle="Loading profile..."
          eyebrow="Member Profile"
          actions={
            <Button
              variant="premium-outline"
              className="rounded-xl"
              onClick={() => router.push('/browse')}
            >
              ← Back to Browse
            </Button>
          }
        />
        <BrowseProfileDetailSkeleton />
      </div>
    );
  }

  if (error || !cv) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <EmptyState
          title="Profile Not Found"
          description={error}
          action={
            <Button variant="premium" className="rounded-xl" onClick={() => router.push('/browse')}>
              Back to Browse
            </Button>
          }
        />
      </div>
    );
  }

  const data = cv.data || {};

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 md:px-10">
      <PageHeader
        title="Profile Details"
        subtitle={`Viewing profile ${cv.short_id}`}
        eyebrow="Member Profile"
        actions={
          <Button variant="premium-outline" className="rounded-xl" onClick={() => router.push('/browse')}>
            ← Back to Browse
          </Button>
        }
      />

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="overflow-hidden py-0 lg:col-span-1">
          <CardContent className="p-6">
            {cv.photo_url ? (
              <img
                src={cv.photo_url}
                alt="Profile"
                className="mb-4 aspect-square w-full rounded-xl object-cover"
              />
            ) : (
              <div className="mb-4 flex aspect-square w-full items-center justify-center rounded-xl bg-fk-bg-top">
                <User className="size-16 text-fk-mauve/30" strokeWidth={1} />
              </div>
            )}

            {canRequestMatch && (
              <div className="space-y-2">
                {pendingIncomingRequestId ? (
                  <div className="space-y-2">
                    <p className="text-center text-sm font-medium text-fk-plum">
                      You received a match request
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="premium"
                        className="h-11 rounded-xl"
                        disabled={responding}
                        onClick={() => handleRespond('approve')}
                      >
                        Return interest
                      </Button>
                      <Button
                        variant="outline"
                        className="h-11 rounded-xl"
                        disabled={responding}
                        onClick={() => handleRespond('reject')}
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                ) : pairMatchStatus &&
                  normalizeMatchStatus(pairMatchStatus) ===
                    MATCH_STATUS.interestReturned ? (
                  <div className="flex flex-col items-center gap-2">
                    <StatusBadge status={pairMatchStatus} />
                    <p className="text-center text-xs text-muted-foreground">
                      Interest returned — begin the introduction from your sent requests
                    </p>
                  </div>
                ) : pairMatchStatus ? (
                  <div className="flex flex-col items-center gap-2">
                    <StatusBadge status={pairMatchStatus} />
                    <p className="text-center text-xs text-muted-foreground">
                      Match request status for this profile
                    </p>
                  </div>
                ) : (
                  <Button
                    variant="premium"
                    className="h-11 w-full rounded-xl"
                    onClick={handleRequestMatch}
                    disabled={
                      sending ||
                      requestSent ||
                      Boolean(matchBlockedReason) ||
                      Boolean(pendingIncomingRequestId)
                    }
                  >
                    {requestSent
                      ? "Request Sent"
                      : matchBlockedReason
                        ? "Request Unavailable"
                        : sending
                          ? "Sending Request..."
                          : "Request Match"}
                  </Button>
                )}
                {matchBlockedReason && (
                  <p className="text-xs text-muted-foreground">{matchBlockedReason}</p>
                )}
                {requestSent && pendingExpiryHint && (
                  <p className="text-xs text-muted-foreground">{pendingExpiryHint}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="py-8">
            <div className="mb-6 text-center">
              <span className="fk-eyebrow text-[10px]">Short ID</span>
              <p className="font-title text-4xl tracking-[0.2em] text-fk-plum-light">{cv.short_id}</p>
            </div>
            <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <CVField label="Gender" value={data.gender} />
              <CVField label="Occupation" value={data.occupation} />
              <CVField label="Education" value={data.education} />
            </div>
          </CardContent>
        </Card>
      </div>

      <BrowseProfileSections data={data} />
    </div>
  );
}