'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { pdf } from '@react-pdf/renderer';
import { CVPdf } from '@/components/CVPdf';
import { toast } from 'sonner';

export default function MyCVPage() {
  const router = useRouter();
  const [cv, setCv] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

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
      const blob = await pdf(
        <CVPdf 
          data={cv.data} 
        />
      ).toBlob();

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

  if (loading) return <div className="p-8 text-center">Loading your CV...</div>;

  if (!cv) {
    return (
      <div className="max-w-3xl mx-auto p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">No CV Found</h1>
        <p className="text-gray-600 mb-6">You haven't submitted a CV yet.</p>
        <Button onClick={() => router.push('/dashboard/cv-builder')}>
          Create CV
        </Button>
      </div>
    );
  }

  const data = cv.data || {};

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">My CV</h1>
          <p className="text-gray-600">
            Short ID: <span className="font-mono font-bold">{cv.short_id}</span>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <Button 
            onClick={handleDownloadPDF} 
            disabled={downloading}
            className="w-full sm:w-auto"
          >
            {downloading ? "Downloading..." : "Download as PDF"}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => router.push('/dashboard/cv-builder')}
            className="w-full sm:w-auto"
          >
            Edit CV
          </Button>
          <Button 
            variant="outline" 
            onClick={() => router.push('/dashboard')}
            className="w-full sm:w-auto"
          >
            ← Back to Dashboard
          </Button>
        </div>
      </div>

      {/* Photo */}
      {cv.photo_url && (
        <div className="mb-8 flex justify-center md:justify-start">
          <img 
            src={cv.photo_url} 
            alt="Your Photo" 
            className="w-48 h-48 object-cover rounded-2xl shadow" 
          />
        </div>
      )}

      {/* Sections */}
      <div className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 text-sm">
            <div><span className="font-medium text-gray-500">Full Name:</span> {data.fullName}</div>
            <div><span className="font-medium text-gray-500">Gender:</span> {data.gender}</div>
            <div><span className="font-medium text-gray-500">Occupation:</span> {data.occupation || 'N/A'}</div>
            <div><span className="font-medium text-gray-500">Education:</span> {data.education || 'N/A'}</div>
          </div>
        </div>

        {/* Personality */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Personality & Individualism</h2>
          <div className="space-y-3 text-sm">
            <div><span className="font-medium">Sense of Humor:</span> {data.senseOfHumor || 'N/A'}</div>
            <div><span className="font-medium">What motivates you:</span> {data.motivation || 'N/A'}</div>
            <div><span className="font-medium">What you would change about yourself:</span> {data.changeAboutSelf || 'N/A'}</div>
          </div>
        </div>

        {/* Partner Preferences */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Partner Preferences</h2>
          <div className="space-y-3 text-sm">
            <div><span className="font-medium">Qualities in a partner:</span> {data.partnerQualities || 'N/A'}</div>
            <div><span className="font-medium">Vision of a successful marriage:</span> {data.marriageVision || 'N/A'}</div>
            <div><span className="font-medium">What you're seeking:</span> {data.whatSeeking || 'N/A'}</div>
            <div><span className="font-medium">Partner’s Age Range:</span> {data.partnerAgeRange || 'N/A'}</div>
            <div><span className="font-medium">Partner’s Education:</span> {data.partnerEducation || 'N/A'}</div>
          </div>
        </div>

        {/* Family + Lifestyle */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Family + Lifestyle & Goals</h2>
          <div className="space-y-3 text-sm">
            <div><span className="font-medium">Role of family:</span> {data.familyRole || 'N/A'}</div>
            <div><span className="font-medium">Hobbies:</span> {data.hobbies || 'N/A'}</div>
            <div><span className="font-medium">Long-term goals:</span> {data.longTermGoals || 'N/A'}</div>
            <div><span className="font-medium">Ideal lifestyle as a couple:</span> {data.idealCoupleLifestyle || 'N/A'}</div>
          </div>
        </div>

        {/* Values & Faith */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Values, Religion & Faith</h2>
          <div className="space-y-3 text-sm">
            <div><span className="font-medium">Important values:</span> {data.importantValues || 'N/A'}</div>
            <div><span className="font-medium">Faith in daily life:</span> {data.faithInDailyLife || 'N/A'}</div>
            <div><span className="font-medium">Practicing faith with spouse:</span> {data.faithWithSpouse || 'N/A'}</div>
          </div>
        </div>

        {/* Communication */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Communication & Conflict Resolution</h2>
          <div className="space-y-3 text-sm">
            <div><span className="font-medium">Approach to conflict:</span> {data.conflictResolution || 'N/A'}</div>
            <div><span className="font-medium">Handling disagreements:</span> {data.handleDisagreements || 'N/A'}</div>
          </div>
        </div>

        {/* Detailed Information */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Detailed Information</h2>
          <div className="space-y-3 text-sm">
            <div><span className="font-medium">Self Description:</span> {data.selfDescription || 'N/A'}</div>
            <div><span className="font-medium">Religious History:</span> {data.religiousHistory || 'N/A'}</div>
            <div><span className="font-medium">Do you pray?:</span> {data.prayLevel || 'N/A'}</div>
            <div><span className="font-medium">Sect / Madhab:</span> {data.sect || 'N/A'}</div>
          </div>
        </div>

        {/* Wali Info */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Guarantor / Wali</h2>
          <div className="space-y-3 text-sm">
            <div><span className="font-medium text-gray-500">Wali’s Name:</span> {data.waliName || 'N/A'}</div>
            <div><span className="font-medium text-gray-500">Relationship:</span> {data.waliRelationship || 'N/A'}</div>
            <div><span className="font-medium text-gray-500">Wali’s Phone:</span> {data.waliPhone || 'N/A'}</div>
            <div><span className="font-medium text-gray-500">Wali’s Email:</span> {data.waliEmail || 'N/A'}</div>
          </div>
        </div>
      </div>

      {/* Bottom Buttons */}
      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <Button onClick={handleDownloadPDF} disabled={downloading} className="w-full sm:w-auto">
          {downloading ? "Downloading..." : "Download as PDF"}
        </Button>
        <Button variant="outline" onClick={() => router.push('/dashboard')} className="w-full sm:w-auto">
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}