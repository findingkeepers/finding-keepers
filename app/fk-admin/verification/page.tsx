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
import { updateVerificationStatus } from '@/app/actions/verification';

interface VerificationRequest {
  id: string;
  submitted_at: string;
  hkid_number: string;
  status: string;
  hkid_image_path: string;
  payment_proof_path: string;
  user_id: string;
  profiles: {
    full_name: string;
    email: string;
    phone: string;
  };
}

export default function AdminVerifications() {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchRequests = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('verification_requests')
      .select(`
        id,
        submitted_at,
        hkid_number,
        status,
        hkid_image_path,
        payment_proof_path,
        user_id,
        profiles (
          full_name,
          email,
          phone
        )
      `)
      .order('submitted_at', { ascending: false });

    if (!error && data) {
      setRequests(data as unknown as VerificationRequest[]);
      setFilteredRequests(data as unknown as VerificationRequest[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    let result = requests;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((req) =>
        req.profiles?.full_name?.toLowerCase().includes(term) ||
        req.profiles?.email?.toLowerCase().includes(term) ||
        req.profiles?.phone?.toLowerCase().includes(term) ||
        req.hkid_number?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((req) => req.status === statusFilter);
    }

    setFilteredRequests(result);
  }, [searchTerm, statusFilter, requests]);

  const updateStatus = async (id: string, newStatus: string, userId: string) => {
    const result = await updateVerificationStatus({
      requestId: id,
      userId,
      newStatus,
    });

    if (!result.success) {
      toast.error(result.message || "Failed to update status");
      return;
    }

    if (newStatus === "verified" && !result.emailSent) {
      toast.warning(result.message || "User verified but email could not be sent");
    } else {
      toast.success(result.message || `Status updated to ${newStatus}`);
    }
    fetchRequests();
  };

  if (loading) return <LoadingSpinner message="Loading verification requests..." />;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Verification Requests"
        subtitle={`${filteredRequests.length} request${filteredRequests.length !== 1 ? 's' : ''} shown`}
        eyebrow="User Verification"
        actions={
          <Button variant="premium-outline" className="rounded-xl" onClick={fetchRequests}>
            Refresh
          </Button>
        }
      />

      <FilterBar columns={3}>
        <div className="space-y-2">
          <Label>Search</Label>
          <Input
            placeholder="Search by name, email, phone or HKID..."
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
            <option value="verified">Verified</option>
            <option value="invalidated">Invalidated</option>
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
        <table className="w-full min-w-[900px]">
          <DataTableHead>
            <tr>
              <DataTableCell header>Submitted</DataTableCell>
              <DataTableCell header>Name</DataTableCell>
              <DataTableCell header>Email</DataTableCell>
              <DataTableCell header>Phone</DataTableCell>
              <DataTableCell header>HKID</DataTableCell>
              <DataTableCell header>Documents</DataTableCell>
              <DataTableCell header>Status</DataTableCell>
              <DataTableCell header>Action</DataTableCell>
            </tr>
          </DataTableHead>
          <tbody>
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted-foreground">
                  No verification requests found.
                </td>
              </tr>
            ) : (
              filteredRequests.map((req) => (
                <DataTableRow key={req.id}>
                  <DataTableCell className="text-sm">
                    {new Date(req.submitted_at).toLocaleString()}
                  </DataTableCell>
                  <DataTableCell className="font-medium">{req.profiles?.full_name || 'N/A'}</DataTableCell>
                  <DataTableCell className="text-sm">{req.profiles?.email}</DataTableCell>
                  <DataTableCell className="text-sm">{req.profiles?.phone || 'N/A'}</DataTableCell>
                  <DataTableCell className="font-mono text-sm">{req.hkid_number}</DataTableCell>
                  <DataTableCell className="text-sm">
                    <a
                      href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/verifications/${req.hkid_image_path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-fk-mauve hover:underline"
                    >
                      HKID
                    </a>
                    <span className="mx-2 text-border">|</span>
                    <a
                      href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/verifications/${req.payment_proof_path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-fk-mauve hover:underline"
                    >
                      Payment
                    </a>
                  </DataTableCell>
                  <DataTableCell>
                    <StatusBadge status={req.status} />
                  </DataTableCell>
                  <DataTableCell>
                    <Select
                      value={req.status}
                      onChange={(e) => updateStatus(req.id, e.target.value, req.user_id)}
                      className="h-9 text-sm"
                    >
                      <option value="pending">Pending</option>
                      <option value="verified">Verified</option>
                      <option value="invalidated">Invalidated</option>
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