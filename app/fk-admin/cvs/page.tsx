'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { pdf } from '@react-pdf/renderer';
import { CVPdf } from '@/components/CVPdf';

interface CV {
  id: string;
  short_id: string;
  photo_url: string | null;
  data: any;
  created_at: string;
}

export default function AdminCVsPage() {
  const router = useRouter();
  const [cvs, setCvs] = useState<CV[]>([]);
  const [filteredCVs, setFilteredCVs] = useState<CV[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [occupationFilter, setOccupationFilter] = useState('');

  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllCVs = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/fk-admin/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || profile.role !== 'admin') {
        router.push('/dashboard');
        return;
      }

      const { data: cvData, error } = await supabase
        .from('cvs')
        .select('id, short_id, photo_url, data, created_at')
        .order('created_at', { ascending: false });

      if (!error && cvData) {
        setCvs(cvData);
        setFilteredCVs(cvData);
      }
      setLoading(false);
    };

    fetchAllCVs();
  }, [router]);

  // Apply filters
  useEffect(() => {
    let result = cvs;

    // Search by name or Short ID
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(cv =>
        cv.short_id.toLowerCase().includes(term) ||
        cv.data?.fullName?.toLowerCase().includes(term)
      );
    }

    // Filter by Gender
    if (genderFilter) {
      result = result.filter(cv =>
        cv.data?.gender?.toLowerCase() === genderFilter.toLowerCase()
      );
    }

    // Filter by Occupation
    if (occupationFilter) {
      result = result.filter(cv =>
        cv.data?.occupation?.toLowerCase().includes(occupationFilter.toLowerCase())
      );
    }

    setFilteredCVs(result);
  }, [searchTerm, genderFilter, occupationFilter, cvs]);

  const handleDownloadPDF = async (cv: CV) => {
    setDownloadingId(cv.id);
    try {
      const blob = await pdf(<CVPdf data={{ ...cv.data, shortID: cv.short_id }} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `CV_${cv.short_id}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to download PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading CVs...</div>;

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Manage CVs</h1>
          <p className="text-gray-600">Total: {filteredCVs.length} / {cvs.length}</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/fk-admin')}>
          ← Back to Dashboard
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="text-sm font-medium">Search (Name / Short ID)</label>
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Gender</label>
          <select
            className="w-full border rounded-md p-2"
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
          >
            <option value="">All Genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Occupation</label>
          <Input
            placeholder="Filter by occupation..."
            value={occupationFilter}
            onChange={(e) => setOccupationFilter(e.target.value)}
          />
        </div>

        <div className="flex items-end">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => {
              setSearchTerm('');
              setGenderFilter('');
              setOccupationFilter('');
            }}
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left p-4">Short ID</th>
              <th className="text-left p-4">Name</th>
              <th className="text-left p-4">Gender</th>
              <th className="text-left p-4">Occupation</th>
              <th className="text-center p-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredCVs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  No CVs found matching your filters.
                </td>
              </tr>
            ) : (
              filteredCVs.map((cv) => (
                <tr key={cv.id} className="border-t hover:bg-gray-50">
                  <td className="p-4 font-mono font-bold tracking-widest">{cv.short_id}</td>
                  <td className="p-4">{cv.data?.fullName}</td>
                  <td className="p-4 capitalize">{cv.data?.gender}</td>
                  <td className="p-4">{cv.data?.occupation || 'N/A'}</td>
                  <td className="p-4 text-center">
                    <Button
                      size="sm"
                      onClick={() => handleDownloadPDF(cv)}
                      disabled={downloadingId === cv.id}
                    >
                      {downloadingId === cv.id ? "Downloading..." : "Download PDF"}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}