'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { requestMatch } from '@/app/actions/match';

export default function ViewProfilePage() {
  const router = useRouter();
  const params = useParams();
  const short_id = params.short_id as string;

  const [cv, setCv] = useState<any>(null);
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

      // Check if match request already exists
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
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading profile...</div>;

  if (error || !cv) {
    return (
      <div className="max-w-3xl mx-auto p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Profile Not Found</h1>
        <p className="text-gray-600 mb-6">{error}</p>
        <Button onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
      </div>
    );
  }

  const data = cv.data || {};
  const isOppositeGender = userGender && data.gender &&
    userGender.toLowerCase() !== data.gender.toLowerCase();

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold">Profile Details</h1>
        <div className="flex gap-3 w-full md:w-auto">
          <Button variant="outline" onClick={() => router.push('/browse')} className="flex-1 md:flex-none">
            ← Back to Browse
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard')} className="flex-1 md:flex-none">
            ← Back to Dashboard
          </Button>
        </div>
      </div>

      {/* Photo + Basic Info + Request Button */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Photo + Request Button */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow p-6">
            {cv.photo_url ? (
              <img 
                src={cv.photo_url} 
                alt="Profile" 
                className="w-full rounded-xl mb-4 aspect-square object-cover" 
              />
            ) : (
              <div className="w-full aspect-square bg-gray-200 flex items-center justify-center rounded-xl mb-4">
                No Photo
              </div>
            )}

            {isOppositeGender && (
              <Button
                className="w-full mt-2"
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
          </div>
        </div>

        {/* Basic Info */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow p-6 h-full">
            <div className="text-center mb-6">
              <span className="text-sm text-gray-500">Short ID</span>
              <p className="text-4xl font-bold tracking-[4px]">{cv.short_id}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 text-sm">
              <div><span className="font-medium text-gray-500">Full Name:</span> {data.fullName}</div>
              <div><span className="font-medium text-gray-500">Gender:</span> {data.gender}</div>
              <div><span className="font-medium text-gray-500">Occupation:</span> {data.occupation || 'N/A'}</div>
              <div><span className="font-medium text-gray-500">Education:</span> {data.education || 'N/A'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-6">
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

        {/* Wali Info (Limited) */}
        {(data.waliName || data.waliRelationship) && (
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Guarantor / Wali</h2>
            <div className="space-y-3 text-sm">
              {data.waliName && <div><span className="font-medium text-gray-500">Wali’s Name:</span> {data.waliName}</div>}
              {data.waliRelationship && <div><span className="font-medium text-gray-500">Relationship:</span> {data.waliRelationship}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}