'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { pdf } from '@react-pdf/renderer';
import { CVPdf } from '@/components/CVPdf';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';
import { EmptyState } from '@/components/layout/EmptyState';
import { CVSectionCard, CVField } from '@/components/cv/CVSectionCard';
import { useDashboardMenu } from '@/components/dashboard/DashboardLayoutProvider';
import { User } from 'lucide-react';

export default function MyCVPage() {
  const router = useRouter();
  const [cv, setCv] = useState<{ short_id: string; photo_url: string | null; data: Record<string, string> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const { onMenuClick } = useDashboardMenu();

  useEffect(() => {
    const fetchMyCV = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: myCV } = await supabase
        .from('cvs')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (myCV) {
        setCv(myCV);
      }
      setLoading(false);
    };

    fetchMyCV();
  }, [router]);

  const handleDownloadPDF = async () => {
    if (!cv) return;

    setDownloading(true);
    try {
      const blob = await pdf(<CVPdf data={cv.data} />).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Finding_Keepers_CV_${cv.short_id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("CV downloaded successfully!");
    } catch (error) {
      console.error("PDF download error:", error);
      toast.error("Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading your CV..." />;

  if (!cv) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          title="No CV Found"
          description="You haven't submitted a CV yet. Create your marriage profile to get started."
          action={
            <Button variant="premium" className="rounded-xl" onClick={() => router.push('/dashboard/cv-builder')}>
              Create CV
            </Button>
          }
        />
      </div>
    );
  }

  const data = cv.data || {};

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="My CV"
        subtitle={`Short ID: ${cv.short_id}`}
        eyebrow="Your Profile"
        onMenuClick={onMenuClick}
        actions={
          <>
            <Button
              variant="premium"
              className="rounded-xl"
              onClick={handleDownloadPDF}
              disabled={downloading}
            >
              {downloading ? "Downloading..." : "Download PDF"}
            </Button>
            <Button
              variant="premium-outline"
              className="rounded-xl"
              onClick={() => router.push('/dashboard/cv-builder')}
            >
              Edit CV
            </Button>
          </>
        }
      />

      {cv.photo_url ? (
        <div className="mb-8 flex justify-center md:justify-start">
          <img
            src={cv.photo_url}
            alt="Your Photo"
            className="size-48 rounded-2xl object-cover shadow-sm"
          />
        </div>
      ) : (
        <div className="mb-8 flex size-48 items-center justify-center rounded-2xl bg-fk-bg-top">
          <User className="size-16 text-fk-mauve/30" strokeWidth={1} />
        </div>
      )}

      <div className="space-y-6">
        <CVSectionCard title="Basic Information" index={0}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CVField label="Full Name" value={data.fullName} />
            <CVField label="Gender" value={data.gender} />
            <CVField label="Occupation" value={data.occupation} />
            <CVField label="Education" value={data.education} />
          </div>
        </CVSectionCard>

        <CVSectionCard title="Personality & Individualism" index={1}>
          <CVField label="Sense of Humor" value={data.senseOfHumor} />
          <CVField label="What motivates you" value={data.motivation} />
          <CVField label="What you would change about yourself" value={data.changeAboutSelf} />
        </CVSectionCard>

        <CVSectionCard title="Partner Preferences" index={2}>
          <CVField label="Qualities in a partner" value={data.partnerQualities} />
          <CVField label="Vision of a successful marriage" value={data.marriageVision} />
          <CVField label="What you're seeking" value={data.whatSeeking} />
          <CVField label="Partner's Age Range" value={data.partnerAgeRange} />
          <CVField label="Partner's Education" value={data.partnerEducation} />
        </CVSectionCard>

        <CVSectionCard title="Family + Lifestyle & Goals" index={3}>
          <CVField label="Role of family" value={data.familyRole} />
          <CVField label="Hobbies" value={data.hobbies} />
          <CVField label="Long-term goals" value={data.longTermGoals} />
          <CVField label="Ideal lifestyle as a couple" value={data.idealCoupleLifestyle} />
        </CVSectionCard>

        <CVSectionCard title="Values, Religion & Faith" index={4}>
          <CVField label="Important values" value={data.importantValues} />
          <CVField label="Faith in daily life" value={data.faithInDailyLife} />
          <CVField label="Practicing faith with spouse" value={data.faithWithSpouse} />
        </CVSectionCard>

        <CVSectionCard title="Communication & Conflict Resolution" index={5}>
          <CVField label="Approach to conflict" value={data.conflictResolution} />
          <CVField label="Handling disagreements" value={data.handleDisagreements} />
        </CVSectionCard>

        <CVSectionCard title="Detailed Information" index={6}>
          <CVField label="Self Description" value={data.selfDescription} />
          <CVField label="Religious History" value={data.religiousHistory} />
          <CVField label="Do you pray?" value={data.prayLevel} />
          <CVField label="Sect / Madhab" value={data.sect} />
        </CVSectionCard>

        <CVSectionCard title="Guarantor / Wali" index={7}>
          <CVField label="Wali's Name" value={data.waliName} />
          <CVField label="Relationship" value={data.waliRelationship} />
          <CVField label="Wali's Phone" value={data.waliPhone} />
          <CVField label="Wali's Email" value={data.waliEmail} />
        </CVSectionCard>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button variant="premium" className="rounded-xl" onClick={handleDownloadPDF} disabled={downloading}>
          {downloading ? "Downloading..." : "Download as PDF"}
        </Button>
        <Button variant="premium-outline" className="rounded-xl" onClick={() => router.push('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}