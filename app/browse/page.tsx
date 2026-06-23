'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface CV {
  id: string;
  short_id: string;
  photo_url: string | null;
  data: any;
}

export default function BrowsePage() {
  const router = useRouter();
  const [cvs, setCvs] = useState<CV[]>([]);
  const [filteredCVs, setFilteredCVs] = useState<CV[]>([]);
  const [loading, setLoading] = useState(true);
  const [userGender, setUserGender] = useState<string | null>(null);

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

      setUserGender(profile.gender);

      const oppositeGender = profile.gender.toLowerCase() === 'male' ? 'female' : 'male';

      // Fetch all CVs first
      const { data: cvData, error } = await supabase
        .from('cvs')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && cvData) {
        // Filter by gender (case-insensitive)
        const filtered = cvData.filter((cv: any) => {
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

  // Filter logic (search + occupation + education)
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

  if (loading) return <div className="p-8 text-center">Loading profiles...</div>;

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold">Browse Profiles</h1>
        <Button variant="outline" onClick={() => router.push('/dashboard')}>
          ← Back to Dashboard
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <input
          type="text"
          placeholder="Search by name or Short ID..."
          className="border rounded-lg p-3 w-full"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <input
          type="text"
          placeholder="Filter by occupation..."
          className="border rounded-lg p-3 w-full"
          value={occupationFilter}
          onChange={(e) => setOccupationFilter(e.target.value)}
        />
        <input
          type="text"
          placeholder="Filter by education..."
          className="border rounded-lg p-3 w-full"
          value={educationFilter}
          onChange={(e) => setEducationFilter(e.target.value)}
        />
        <Button
          variant="outline"
          onClick={() => {
            setSearchTerm('');
            setOccupationFilter('');
            setEducationFilter('');
          }}
        >
          Clear Filters
        </Button>
      </div>

      {filteredCVs.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-600 text-lg">No profiles found matching your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCVs.map((cv) => (
            <div 
              key={cv.id} 
              className="bg-white rounded-2xl shadow overflow-hidden hover:shadow-lg transition"
            >
              {cv.photo_url ? (
                <img 
                  src={cv.photo_url} 
                  alt="Profile" 
                  className="w-full h-56 object-cover" 
                />
              ) : (
                <div className="w-full h-56 bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500">No Photo</span>
                </div>
              )}

              <div className="p-5">
                <div className="mb-4">
                  <span className="text-xs text-gray-500">Short ID</span>
                  <p className="text-2xl font-bold tracking-[3px]">{cv.short_id}</p>
                </div>

                <div className="text-sm space-y-1.5 mb-5">
                  <p><span className="font-medium">Name:</span> {cv.data?.fullName}</p>
                  <p><span className="font-medium">Occupation:</span> {cv.data?.occupation || 'N/A'}</p>
                  <p><span className="font-medium">Education:</span> {cv.data?.education || 'N/A'}</p>
                </div>

                <Button 
                  className="w-full" 
                  onClick={() => router.push(`/browse/${cv.short_id}`)}
                >
                  View Profile
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}