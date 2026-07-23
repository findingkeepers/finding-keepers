'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { downloadCvPdf } from '@/lib/download-cv-pdf';
import { adminDeleteCv } from '@/app/actions/admin-cv';
import { PageHeader } from '@/components/layout/PageHeader';
import { FilterBar } from '@/components/layout/FilterBar';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';
import { DataTable, DataTableHead, DataTableRow, DataTableCell } from '@/components/layout/DataTable';
import { toast } from 'sonner';

interface CV {
  id: string;
  short_id: string;
  photo_url: string | null;
  data: Record<string, string>;
  created_at: string;
  profiles:
    | {
        gender: string | null;
      }
    | {
        gender: string | null;
      }[]
    | null;
}

function getProfileGender(cv: CV) {
  if (!cv.profiles) {
    return cv.data?.gender ?? null;
  }

  const profile = Array.isArray(cv.profiles) ? cv.profiles[0] : cv.profiles;
  return profile?.gender ?? cv.data?.gender ?? null;
}

export default function AdminCVsPage() {
  const [cvs, setCvs] = useState<CV[]>([]);
  const [filteredCVs, setFilteredCVs] = useState<CV[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [occupationFilter, setOccupationFilter] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAllCVs = async () => {
    setLoading(true);
    const { data: cvData, error } = await supabase
      .from('cvs')
      .select('id, short_id, photo_url, data, created_at, profiles(gender)')
      .order('created_at', { ascending: false });

    if (!error && cvData) {
      setCvs(cvData as CV[]);
      setFilteredCVs(cvData as CV[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void fetchAllCVs();
  }, []);

  useEffect(() => {
    let result = cvs;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(cv =>
        cv.short_id.toLowerCase().includes(term) ||
        cv.data?.fullName?.toLowerCase().includes(term)
      );
    }

    if (genderFilter) {
      result = result.filter(
        (cv) =>
          getProfileGender(cv)?.toLowerCase() === genderFilter.toLowerCase()
      );
    }

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
      const result = await downloadCvPdf({
        data: cv.data,
        shortId: cv.short_id,
        photoUrl: cv.photo_url,
        filename: `CV_${cv.short_id}.pdf`,
      });
      toast.success(
        result.hasPhoto
          ? 'CV downloaded successfully'
          : 'CV downloaded (photo could not be embedded)'
      );
    } catch (error) {
      console.error('PDF download error:', error);
      toast.error('Failed to download PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDeleteCV = async (cv: CV) => {
    const confirmed = window.confirm(
      `Delete CV ${cv.short_id} (${cv.data?.fullName || 'unnamed'}) permanently? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(cv.id);
    try {
      const result = await adminDeleteCv({ cvId: cv.id });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setCvs((current) => current.filter((item) => item.id !== cv.id));
    } catch (error) {
      console.error('Admin CV delete error:', error);
      toast.error('Failed to delete CV');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <LoadingSpinner message="Loading CVs..." />;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Manage CVs"
        subtitle={`${filteredCVs.length} of ${cvs.length} CVs`}
        eyebrow="CV Management"
      />

      <FilterBar>
        <div className="space-y-2">
          <Label>Search</Label>
          <Input
            placeholder="Name or Short ID..."
            className="h-11 rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Gender</Label>
          <Select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)}>
            <option value="">All Genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </Select>
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
        <div className="flex items-end">
          <Button
            variant="premium-outline"
            className="h-11 w-full rounded-xl"
            onClick={() => {
              setSearchTerm('');
              setGenderFilter('');
              setOccupationFilter('');
            }}
          >
            Clear Filters
          </Button>
        </div>
      </FilterBar>

      <DataTable>
        <table className="w-full min-w-[600px]">
          <DataTableHead>
            <tr>
              <DataTableCell header>Short ID</DataTableCell>
              <DataTableCell header>Name</DataTableCell>
              <DataTableCell header>Gender</DataTableCell>
              <DataTableCell header>Occupation</DataTableCell>
              <DataTableCell header>Action</DataTableCell>
            </tr>
          </DataTableHead>
          <tbody>
            {filteredCVs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  No CVs found matching your filters.
                </td>
              </tr>
            ) : (
              filteredCVs.map((cv) => (
                <DataTableRow key={cv.id}>
                  <DataTableCell className="font-mono font-medium tracking-widest text-fk-plum">
                    {cv.short_id}
                  </DataTableCell>
                  <DataTableCell>{cv.data?.fullName}</DataTableCell>
                  <DataTableCell className="capitalize">
                    {getProfileGender(cv) || 'N/A'}
                  </DataTableCell>
                  <DataTableCell>{cv.data?.occupation || 'N/A'}</DataTableCell>
                  <DataTableCell>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="premium"
                        size="sm"
                        className="rounded-lg"
                        onClick={() => handleDownloadPDF(cv)}
                        disabled={
                          downloadingId === cv.id || deletingId === cv.id
                        }
                      >
                        {downloadingId === cv.id
                          ? 'Downloading...'
                          : 'Download PDF'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg text-destructive hover:text-destructive"
                        onClick={() => void handleDeleteCV(cv)}
                        disabled={
                          downloadingId === cv.id || deletingId === cv.id
                        }
                      >
                        {deletingId === cv.id ? 'Deleting...' : 'Delete'}
                      </Button>
                    </div>
                  </DataTableCell>
                </DataTableRow>
              ))
            )}
          </tbody>
        </table>
      </DataTable>
    </div>
  );
}