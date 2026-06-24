'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/layout/PageHeader';
import { FilterBar } from '@/components/layout/FilterBar';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';
import { EmptyState } from '@/components/layout/EmptyState';
import { ProfileCard } from '@/components/browse/ProfileCard';

interface CV {
  id: string;
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
  const [occupationFilter, setOccupationFilter] = useState('');
  const [educationFilter, setEducationFilter] = useState('');

  useEffect(() => {
    const fetchOppositeGenderCVs = async () => {
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

      const oppositeGender = profile.gender.toLowerCase() === 'male' ? 'female' : 'male';

      const { data: cvData, error } = await supabase
        .from('cvs')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && cvData) {
        const filtered = cvData.filter((cv: CV) => {
          const cvGender = cv.data?.gender?.toLowerCase();
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
      result = result.filter(cv =>
        cv.data?.fullName?.toLowerCase().includes(term) ||
        cv.short_id?.toLowerCase().includes(term)
      );
    }

    if (occupationFilter) {
      result = result.filter(cv =>
        cv.data?.occupation?.toLowerCase().includes(occupationFilter.toLowerCase())
      );
    }

    if (educationFilter) {
      result = result.filter(cv =>
        cv.data?.education?.toLowerCase().includes(educationFilter.toLowerCase())
      );
    }

    setFilteredCVs(result);
  }, [searchTerm, occupationFilter, educationFilter, cvs]);

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

      <FilterBar>
        <div className="space-y-2">
          <Label>Search</Label>
          <Input
            placeholder="Search by name or Short ID..."
            className="h-11 rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Occupation</Label>
          <Input
            placeholder="Filter by occupation..."
            className="h-11 rounded-xl"
            value={occupationFilter}
            onChange={(e) => setOccupationFilter(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Education</Label>
          <Input
            placeholder="Filter by education..."
            className="h-11 rounded-xl"
            value={educationFilter}
            onChange={(e) => setEducationFilter(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <Button
            variant="premium-outline"
            className="h-11 w-full rounded-xl"
            onClick={() => {
              setSearchTerm('');
              setOccupationFilter('');
              setEducationFilter('');
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
              fullName={cv.data?.fullName}
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