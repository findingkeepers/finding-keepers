'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { bootstrapClientSession } from '@/lib/auth/bootstrap-session';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { PageHeader } from '@/components/layout/PageHeader';
import { FilterBar } from '@/components/layout/FilterBar';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';
import { EmptyState } from '@/components/layout/EmptyState';
import { ProfileCard } from '@/components/browse/ProfileCard';
import { ETHNICITY_OPTIONS, RESIDENCY_OPTIONS } from '@/lib/cv-constants';
import { getOppositeProfileGender, normalizeToProfileGender } from '@/lib/gender';

interface CV {
  id: string;
  user_id: string;
  short_id: string;
  photo_url: string | null;
  data: Record<string, string>;
}

export default function BrowsePage() {
  const router = useRouter();
  const [cvs, setCvs] = useState<CV[]>([]);
  const [filteredCVs, setFilteredCVs] = useState<CV[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [ethnicityFilter, setEthnicityFilter] = useState('');
  const [visaFilter, setVisaFilter] = useState('');
  const [employmentFilter, setEmploymentFilter] = useState('');

  useEffect(() => {
    const fetchOppositeGenderCVs = async () => {
      const session = await bootstrapClientSession();
      if (!session.authenticated) {
        router.push('/login');
        return;
      }

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

      const oppositeGender = getOppositeProfileGender(profile.gender);

      const [{ data: cvData, error }, { data: verifiedProfiles }] = await Promise.all([
        supabase.from('cvs').select('*').order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('id')
          .eq('verification_status', 'verified'),
      ]);

      if (!error && cvData && oppositeGender) {
        const verifiedUserIds = new Set(
          (verifiedProfiles ?? []).map((p) => p.id)
        );

        const filtered = cvData.filter((cv: CV) => {
          if (cv.user_id === user.id) return false;
          if (!verifiedUserIds.has(cv.user_id)) return false;

          const cvGender = normalizeToProfileGender(cv.data?.gender);
          return cvGender === oppositeGender;
        });

        setCvs(filtered);
        setFilteredCVs(filtered);
      }

      setLoading(false);
    };

    fetchOppositeGenderCVs();
  }, [router]);

  useEffect(() => {
    let result = cvs;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((cv) =>
        cv.short_id?.toLowerCase().includes(term)
      );
    }

    if (ethnicityFilter) {
      result = result.filter(cv => cv.data?.ethnicBackground === ethnicityFilter);
    }

    if (visaFilter) {
      result = result.filter(cv => cv.data?.residencyStatus === visaFilter);
    }

    if (employmentFilter) {
      result = result.filter(cv =>
        cv.data?.occupation?.toLowerCase().includes(employmentFilter.toLowerCase())
      );
    }

    setFilteredCVs(result);
  }, [searchTerm, ethnicityFilter, visaFilter, employmentFilter, cvs]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-8">
        <LoadingSpinner message="Loading profiles..." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 md:px-10">
      <PageHeader
        title="Browse Profiles"
        subtitle="Discover verified members who may be your right fit."
        eyebrow="Find Your Match"
      />

      <FilterBar columns={3}>
        <div className="space-y-2">
          <Label>Search</Label>
          <Input
            placeholder="Search by Short ID..."
            className="h-11 rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Ethnicity</Label>
          <Select value={ethnicityFilter} onChange={(e) => setEthnicityFilter(e.target.value)}>
            <option value="">All ethnicities</option>
            {ETHNICITY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Visa Status</Label>
          <Select value={visaFilter} onChange={(e) => setVisaFilter(e.target.value)}>
            <option value="">All visa statuses</option>
            {RESIDENCY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Employment</Label>
          <Input
            placeholder="Filter by occupation..."
            className="h-11 rounded-xl"
            value={employmentFilter}
            onChange={(e) => setEmploymentFilter(e.target.value)}
          />
        </div>
        <div className="flex items-end md:col-span-2">
          <Button
            variant="premium-outline"
            className="h-11 w-full rounded-xl"
            onClick={() => {
              setSearchTerm('');
              setEthnicityFilter('');
              setVisaFilter('');
              setEmploymentFilter('');
            }}
          >
            Clear Filters
          </Button>
        </div>
      </FilterBar>

      {filteredCVs.length === 0 ? (
        <EmptyState
          title="No Profiles Found"
          description="No profiles match your current filters. Try adjusting your search criteria."
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredCVs.map((cv, index) => (
            <ProfileCard
              key={cv.id}
              shortId={cv.short_id}
              occupation={cv.data?.occupation}
              education={cv.data?.education}
              photoUrl={cv.photo_url}
              index={index}
              onView={() => router.push(`/browse/${cv.short_id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}