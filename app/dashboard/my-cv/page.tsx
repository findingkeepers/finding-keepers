'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { downloadCvPdf } from '@/lib/download-cv-pdf';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';
import { EmptyState } from '@/components/layout/EmptyState';
import { CVPreview } from '@/components/cv/CVPreview';
import { useDashboardMenu } from '@/components/dashboard/DashboardLayoutProvider';

export default function MyCVPage() {
  const router = useRouter();
  const [cv, setCv] = useState<{
    short_id: string;
    photo_url: string | null;
    data: Record<string, string>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const { onMenuClick } = useDashboardMenu();

  useEffect(() => {
    const fetchMyCV = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: myCV } = await supabase
        .from('cvs')
        .select('short_id, photo_url, data')
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
      const result = await downloadCvPdf({
        data: cv.data,
        shortId: cv.short_id,
        photoUrl: cv.photo_url,
        filename: `Finding_Keepers_CV_${cv.short_id}.pdf`,
      });
      toast.success(
        result.hasPhoto
          ? 'CV downloaded successfully!'
          : 'CV downloaded (photo could not be embedded)'
      );
    } catch (error) {
      console.error('PDF download error:', error);
      toast.error('Failed to download PDF');
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
            <Button
              variant="premium"
              className="rounded-xl"
              onClick={() => router.push('/dashboard/cv-builder')}
            >
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
              {downloading ? 'Downloading...' : 'Download PDF'}
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

      <CVPreview
        data={data}
        shortId={cv.short_id}
        photoUrl={cv.photo_url || undefined}
        intro="This is how your profile appears to verified members on Browse. Use Edit CV to update all fields, including private details not shown here."
      />

      <div className="mt-8 flex flex-wrap gap-3">
        <Button
          variant="premium-outline"
          className="rounded-xl"
          onClick={() => router.push('/dashboard')}
        >
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}