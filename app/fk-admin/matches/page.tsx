'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { PageHeader } from '@/components/layout/PageHeader';
import { FilterBar } from '@/components/layout/FilterBar';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';
import { DataTable, DataTableHead, DataTableRow, DataTableCell } from '@/components/layout/DataTable';
import { StatusBadge } from '@/components/ui/status-badge';
import { toast } from 'sonner';
import { MatchDirectionDisplay } from '@/components/match/MatchDirectionDisplay';

interface MatchRequest {
  id: string;
  male_short_id: string;
  female_short_id: string;
  male_name: string;
  female_name: string;
  requested_by_short_id?: string | null;
  status: string;
  created_at: string;
}

export default function AdminMatchesPage() {
  const [requests, setRequests] = useState<MatchRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<MatchRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchMatchRequests = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('match_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRequests(data);
      setFilteredRequests(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMatchRequests();
  }, []);

  useEffect(() => {
    let result = requests;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (req) =>
          req.male_name?.toLowerCase().includes(term) ||
          req.female_name?.toLowerCase().includes(term) ||
          req.male_short_id?.toLowerCase().includes(term) ||
          req.female_short_id?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((req) => req.status === statusFilter);
    }

    setFilteredRequests(result);
  }, [searchTerm, statusFilter, requests]);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('match_requests')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) {
        console.error("Update error:", error);
        toast.error("Failed to update status. Check RLS policies.");
        return;
      }

      toast.success(`Status updated to ${newStatus}`);
      fetchMatchRequests();
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Something went wrong while updating status");
    }
  };

  if (loading) return <LoadingSpinner message="Loading match requests..." />;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Match Requests"
        subtitle={`${filteredRequests.length} of ${requests.length} requests`}
        eyebrow="Match Management"
        actions={
          <Button variant="premium-outline" className="rounded-xl" onClick={fetchMatchRequests}>
            Refresh
          </Button>
        }
      />

      <FilterBar columns={3}>
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
          <Label>Status</Label>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="contacted">Contacted</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </Select>
        </div>
        <div className="flex items-end">
          <Button
            variant="premium-outline"
            className="h-11 w-full rounded-xl"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
            }}
          >
            Clear Filters
          </Button>
        </div>
      </FilterBar>

      <DataTable>
        <table className="w-full min-w-[700px]">
          <DataTableHead>
            <tr>
              <DataTableCell header>Submitted</DataTableCell>
              <DataTableCell header>Request Direction</DataTableCell>
              <DataTableCell header>Status</DataTableCell>
              <DataTableCell header>Action</DataTableCell>
            </tr>
          </DataTableHead>
          <tbody>
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-muted-foreground">
                  No match requests found.
                </td>
              </tr>
            ) : (
              filteredRequests.map((req) => (
                <DataTableRow key={req.id}>
                  <DataTableCell className="text-sm">
                    {new Date(req.created_at).toLocaleString()}
                  </DataTableCell>
                  <DataTableCell>
                    <MatchDirectionDisplay
                      maleShortId={req.male_short_id}
                      femaleShortId={req.female_short_id}
                      requestedByShortId={req.requested_by_short_id}
                      maleName={req.male_name}
                      femaleName={req.female_name}
                      showNames
                    />
                  </DataTableCell>
                  <DataTableCell>
                    <StatusBadge status={req.status} />
                  </DataTableCell>
                  <DataTableCell>
                    <Select
                      value={req.status}
                      onChange={(e) => updateStatus(req.id, e.target.value)}
                      className="h-9 text-sm"
                    >
                      <option value="pending">Pending</option>
                      <option value="contacted">Contacted</option>
                      <option value="completed">Completed</option>
                      <option value="rejected">Rejected</option>
                    </Select>
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