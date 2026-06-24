'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Heart, FileText } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';
import { AdminStatCard } from '@/components/admin/AdminStatCard';
import { AdminActionCard } from '@/components/admin/AdminActionCard';

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    pendingVerifications: 0,
    pendingMatches: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const { count: pendingVerifications } = await supabase
        .from('verification_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { count: pendingMatches } = await supabase
        .from('match_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      setStats({
        pendingVerifications: pendingVerifications || 0,
        pendingMatches: pendingMatches || 0,
      });

      setLoading(false);
    };

    fetchStats();
  }, []);

  if (loading) return <LoadingSpinner message="Loading admin dashboard..." />;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Admin Dashboard"
        subtitle="Finding Keepers management panel"
        eyebrow="Administration"
      />

      <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-2">
        <AdminStatCard
          label="Pending Verifications"
          value={stats.pendingVerifications}
          icon={ShieldCheck}
          accent="amber"
          index={0}
          onClick={() => router.push('/fk-admin/verification')}
        />
        <AdminStatCard
          label="Pending Match Requests"
          value={stats.pendingMatches}
          icon={Heart}
          accent="sky"
          index={1}
          onClick={() => router.push('/fk-admin/matches')}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <AdminActionCard
          title="Verification Requests"
          description="Review and approve new user verification requests."
          icon={ShieldCheck}
          actionLabel="Manage Verifications"
          onAction={() => router.push('/fk-admin/verification')}
          index={0}
        />
        <AdminActionCard
          title="Match Requests"
          description="View and manage user match requests."
          icon={Heart}
          actionLabel="Manage Matches"
          onAction={() => router.push('/fk-admin/matches')}
          index={1}
        />
        <AdminActionCard
          title="Manage CVs"
          description="View and manage all submitted CVs."
          icon={FileText}
          actionLabel="View All CVs"
          onAction={() => router.push('/fk-admin/cvs')}
          index={2}
        />
      </div>
    </div>
  );
}