'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    pendingVerifications: 0,
    pendingMatches: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
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

      // Get pending verifications count
      const { count: pendingVerifications } = await supabase
        .from('verification_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Get pending match requests count
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
  }, [router]);

  if (loading) return <div className="p-8 text-center">Loading admin dashboard...</div>;

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-600">Finding Keepers Management Panel</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/dashboard')}>
          ← Back to User Dashboard
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white p-6 rounded-2xl shadow">
          <div className="text-sm text-gray-500">Pending Verifications</div>
          <div className="text-4xl font-bold mt-2 text-yellow-600">
            {stats.pendingVerifications}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow">
          <div className="text-sm text-gray-500">Pending Match Requests</div>
          <div className="text-4xl font-bold mt-2 text-blue-600">
            {stats.pendingMatches}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow flex items-center justify-center">
          <Button 
            className="w-full" 
            onClick={() => router.push('/fk-admin/verification')}
          >
            Go to Verifications
          </Button>
        </div>
      </div>

      {/* Main Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Verification Requests */}
        <div 
          onClick={() => router.push('/fk-admin/verification')}
          className="bg-white p-8 rounded-2xl shadow hover:shadow-lg transition cursor-pointer border border-gray-100"
        >
          <div className="text-2xl font-semibold mb-3">Verification Requests</div>
          <p className="text-gray-600 mb-6">
            Review and approve new user verification requests.
          </p>
          <Button className="w-full">Manage Verifications</Button>
        </div>

        {/* Match Requests */}
        <div 
          onClick={() => router.push('/fk-admin/matches')}
          className="bg-white p-8 rounded-2xl shadow hover:shadow-lg transition cursor-pointer border border-gray-100"
        >
          <div className="text-2xl font-semibold mb-3">Match Requests</div>
          <p className="text-gray-600 mb-6">
            View and manage user match requests.
          </p>
          <Button className="w-full">Manage Matches</Button>
        </div>

        {/* CV Management */}
        <div 
          onClick={() => router.push('/fk-admin/cvs')}
          className="bg-white p-8 rounded-2xl shadow hover:shadow-lg transition cursor-pointer border border-gray-100"
        >
          <div className="text-2xl font-semibold mb-3">Manage CVs</div>
          <p className="text-gray-600 mb-6">
            View and manage all submitted CVs.
          </p>
          <Button className="w-full">View All CVs</Button>
        </div>

      </div>
    </div>
  );
}