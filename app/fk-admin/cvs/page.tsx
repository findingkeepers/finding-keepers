'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { pdf } from '@react-pdf/renderer';
import { CVPdf } from '@/components/CVPdf';
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
}

export default function AdminCVsPage() {
  const [cvs, setCvs] = useState<CV[]>([]);
  const [filteredCVs, setFilteredCVs] = useState<CV[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [occupationFilter, setOccupationFilter] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllCVs = async () => {
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
      result = result.filter(cv =>
        cv.data?.gender?.toLowerCase() === genderFilter.toLowerCase()
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
      const blob = await pdf(<CVPdf data={{ ...cv.data, shortID: cv.short_id }} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `CV_${cv.short_id}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download PDF");
    } finally {
      setDownloadingId(null);
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
                  <DataTableCell className="capitalize">{cv.data?.gender}</DataTableCell>
                  <DataTableCell>{cv.data?.occupation || 'N/A'}</DataTableCell>
                  <DataTableCell>
                    <Button
                      variant="premium"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => handleDownloadPDF(cv)}
                      disabled={downloadingId === cv.id}
                    >
                      {downloadingId === cv.id ? "Downloading..." : "Download PDF"}
                    </Button>
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