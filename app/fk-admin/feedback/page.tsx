'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { PageHeader } from '@/components/layout/PageHeader';
import { FilterBar } from '@/components/layout/FilterBar';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';
import {
  DataTable,
  DataTableHead,
  DataTableRow,
  DataTableCell,
} from '@/components/layout/DataTable';
import { StatusBadge } from '@/components/ui/status-badge';

type FeedbackRow = {
  id: string;
  user_id: string | null;
  rating: number | null;
  category: string | null;
  message: string;
  source: string | null;
  created_at: string;
  profiles:
    | {
        full_name: string | null;
        email: string | null;
      }
    | {
        full_name: string | null;
        email: string | null;
      }[]
    | null;
};

function getProfile(row: FeedbackRow) {
  if (!row.profiles) return null;
  return Array.isArray(row.profiles) ? row.profiles[0] ?? null : row.profiles;
}

function formatCategory(value: string | null) {
  if (!value) return 'General';
  return value.replace(/_/g, ' ');
}

export default function AdminFeedbackPage() {
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  const fetchFeedback = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('platform_feedback')
      .select('id, user_id, rating, category, message, source, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Admin feedback load error:', error);
      setRows([]);
      setLoading(false);
      return;
    }

    const feedbackRows = data ?? [];
    const userIds = Array.from(
      new Set(
        feedbackRows
          .map((row) => row.user_id)
          .filter((id): id is string => Boolean(id))
      )
    );

    let profileById = new Map<
      string,
      { full_name: string | null; email: string | null }
    >();

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      profileById = new Map(
        (profiles ?? []).map((profile) => [
          profile.id as string,
          {
            full_name: profile.full_name ?? null,
            email: profile.email ?? null,
          },
        ])
      );
    }

    setRows(
      feedbackRows.map((row) => ({
        ...row,
        profiles: row.user_id ? profileById.get(row.user_id) ?? null : null,
      })) as FeedbackRow[]
    );

    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchFeedback();
  }, [fetchFeedback]);

  const filteredRows = useMemo(() => {
    let result = rows;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((row) => {
        const profile = getProfile(row);
        return (
          row.message.toLowerCase().includes(term) ||
          profile?.full_name?.toLowerCase().includes(term) ||
          profile?.email?.toLowerCase().includes(term) ||
          row.category?.toLowerCase().includes(term) ||
          row.source?.toLowerCase().includes(term)
        );
      });
    }

    if (categoryFilter !== 'all') {
      result = result.filter((row) => (row.category || 'general') === categoryFilter);
    }

    if (sourceFilter !== 'all') {
      result = result.filter((row) => (row.source || 'general') === sourceFilter);
    }

    return result;
  }, [rows, searchTerm, categoryFilter, sourceFilter]);

  if (loading) return <LoadingSpinner message="Loading feedback..." />;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Platform Feedback"
        subtitle={`${filteredRows.length} of ${rows.length} responses`}
        eyebrow="Member Insights"
        actions={
          <Button
            variant="premium-outline"
            className="rounded-xl"
            onClick={() => void fetchFeedback()}
          >
            Refresh
          </Button>
        }
      />

      <FilterBar columns={4}>
        <div className="space-y-2">
          <Label>Search</Label>
          <Input
            placeholder="Name, email, message..."
            className="h-11 rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All categories</option>
            <option value="general">General experience</option>
            <option value="verification">Verification</option>
            <option value="cv_builder">CV Builder</option>
            <option value="browse_matching">Browse & matching</option>
            <option value="privacy">Privacy & photos</option>
            <option value="other">Other</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Source</Label>
          <Select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
          >
            <option value="all">All sources</option>
            <option value="cv_complete">After CV submit</option>
            <option value="dashboard">Dashboard</option>
            <option value="general">General</option>
          </Select>
        </div>
        <div className="flex items-end">
          <Button
            variant="premium-outline"
            className="h-11 w-full rounded-xl"
            onClick={() => {
              setSearchTerm('');
              setCategoryFilter('all');
              setSourceFilter('all');
            }}
          >
            Clear Filters
          </Button>
        </div>
      </FilterBar>

      <DataTable>
        <table className="w-full min-w-[900px]">
          <DataTableHead>
            <tr>
              <DataTableCell header>Submitted</DataTableCell>
              <DataTableCell header>Member</DataTableCell>
              <DataTableCell header>Rating</DataTableCell>
              <DataTableCell header>Category</DataTableCell>
              <DataTableCell header>Source</DataTableCell>
              <DataTableCell header>Message</DataTableCell>
            </tr>
          </DataTableHead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  No feedback found.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => {
                const profile = getProfile(row);
                return (
                  <DataTableRow key={row.id}>
                    <DataTableCell className="whitespace-nowrap text-sm">
                      {new Date(row.created_at).toLocaleString()}
                    </DataTableCell>
                    <DataTableCell>
                      <div className="min-w-[160px]">
                        <p className="font-medium text-fk-plum">
                          {profile?.full_name || 'Unknown member'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {profile?.email || 'No email'}
                        </p>
                      </div>
                    </DataTableCell>
                    <DataTableCell>
                      {row.rating ? (
                        <StatusBadge status={`${row.rating}/5`} />
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </DataTableCell>
                    <DataTableCell className="capitalize text-sm">
                      {formatCategory(row.category)}
                    </DataTableCell>
                    <DataTableCell className="text-sm capitalize">
                      {(row.source || 'general').replace(/_/g, ' ')}
                    </DataTableCell>
                    <DataTableCell className="max-w-md text-sm leading-relaxed text-fk-body">
                      {row.message}
                    </DataTableCell>
                  </DataTableRow>
                );
              })
            )}
          </tbody>
        </table>
      </DataTable>
    </div>
  );
}
