'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/PageHeader';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';
import { EmptyState } from '@/components/layout/EmptyState';
import { CVSectionCard, CVField } from '@/components/cv/CVSectionCard';
import { toast } from 'sonner';
import { requestMatch } from '@/app/actions/match';
import { User } from 'lucide-react';

export default function ViewProfilePage() {
  const router = useRouter();
  const params = useParams();
  const short_id = params.short_id as string;

  const [cv, setCv] = useState<{ short_id: string; photo_url: string | null; data: Record<string, string> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [userGender, setUserGender] = useState<string | null>(null);
  const [requestSent, setRequestSent] = useState(false);

  useEffect(() => {
    const fetchCV = async () => {
      if (!short_id) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('gender, verification_status')
        .eq('id', user.id)
        .single();

      if (!profile || profile.verification_status !== 'verified') {
        router.push('/dashboard');
        return;
      }

      setUserGender(profile.gender);

      const { data: cvData, error: cvError } = await supabase
        .from('cvs')
        .select('*')
        .eq('short_id', short_id)
        .single();

      if (cvError || !cvData) {
        setError('Profile not found');
        setLoading(false);
        return;
      }

      setCv(cvData);

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
            .select('id')
            .or(
              `and(male_short_id.eq.${current},female_short_id.eq.${viewed}),` +
              `and(male_short_id.eq.${viewed},female_short_id.eq.${current})`
            )
            .limit(1);

          if (existing && existing.length > 0) {
            setRequestSent(true);
          }
        }
      } catch (err) {
        console.error("Match request check error:", err);
      }

      setLoading(false);
    };

    fetchCV();
  }, [short_id, router]);

  const handleRequestMatch = async () => {
    if (!cv || !userGender || requestSent) return;

    setSending(true);

    try {
      const result = await requestMatch({
        profileShortId: short_id,
        profileName: cv.data?.fullName,
        profileGender: cv.data?.gender,
      });

      if (result.success) {
        toast.success("Match request sent successfully!");
        setRequestSent(true);
      } else {
        toast.error(result.message || "Failed to send request");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-8">
        <LoadingSpinner message="Loading profile..." />
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
  const isOppositeGender = userGender && data.gender &&
    userGender.toLowerCase() !== data.gender.toLowerCase();

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

            {isOppositeGender && (
              <Button
                variant="premium"
                className="h-11 w-full rounded-xl"
                onClick={handleRequestMatch}
                disabled={sending || requestSent}
              >
                {requestSent
                  ? "Request Sent"
                  : sending
                    ? "Sending Request..."
                    : "Request Match"}
              </Button>
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
              <CVField label="Full Name" value={data.fullName} />
              <CVField label="Gender" value={data.gender} />
              <CVField label="Occupation" value={data.occupation} />
              <CVField label="Education" value={data.education} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <CVSectionCard title="Personality & Individualism" index={0}>
          <CVField label="Sense of Humor" value={data.senseOfHumor} />
          <CVField label="What motivates you" value={data.motivation} />
          <CVField label="What you would change about yourself" value={data.changeAboutSelf} />
        </CVSectionCard>

        <CVSectionCard title="Partner Preferences" index={1}>
          <CVField label="Qualities in a partner" value={data.partnerQualities} />
          <CVField label="Vision of a successful marriage" value={data.marriageVision} />
          <CVField label="What you're seeking" value={data.whatSeeking} />
          <CVField label="Partner's Age Range" value={data.partnerAgeRange} />
          <CVField label="Partner's Education" value={data.partnerEducation} />
        </CVSectionCard>

        <CVSectionCard title="Family + Lifestyle & Goals" index={2}>
          <CVField label="Role of family" value={data.familyRole} />
          <CVField label="Hobbies" value={data.hobbies} />
          <CVField label="Long-term goals" value={data.longTermGoals} />
          <CVField label="Ideal lifestyle as a couple" value={data.idealCoupleLifestyle} />
        </CVSectionCard>

        <CVSectionCard title="Values, Religion & Faith" index={3}>
          <CVField label="Important values" value={data.importantValues} />
          <CVField label="Faith in daily life" value={data.faithInDailyLife} />
          <CVField label="Practicing faith with spouse" value={data.faithWithSpouse} />
        </CVSectionCard>

        <CVSectionCard title="Communication & Conflict Resolution" index={4}>
          <CVField label="Approach to conflict" value={data.conflictResolution} />
          <CVField label="Handling disagreements" value={data.handleDisagreements} />
        </CVSectionCard>

        <CVSectionCard title="Detailed Information" index={5}>
          <CVField label="Self Description" value={data.selfDescription} />
          <CVField label="Religious History" value={data.religiousHistory} />
          <CVField label="Do you pray?" value={data.prayLevel} />
          <CVField label="Sect / Madhab" value={data.sect} />
        </CVSectionCard>

        {(data.waliName || data.waliRelationship) && (
          <CVSectionCard title="Guarantor / Wali" index={6}>
            <CVField label="Wali's Name" value={data.waliName} />
            <CVField label="Relationship" value={data.waliRelationship} />
          </CVSectionCard>
        )}
      </div>
    </div>
  );
}