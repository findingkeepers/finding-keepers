'use client';

import { useState } from 'react';
import { loginUser } from '@/app/actions/auth';
import { getBrowserSupabaseClient } from '@/lib/supabase/browser';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthCard } from '@/components/layout/AuthCard';
import { toast } from 'sonner';

export default function AdminLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const result = await loginUser({ email, password, rememberMe: true });

    if (!result.ok) {
      toast.error(result.message);
      setLoading(false);
      return;
    }

    const client = getBrowserSupabaseClient();
    const sessionResponse = await fetch('/api/auth/session', {
      credentials: 'include',
      cache: 'no-store',
    });

    if (sessionResponse.ok) {
      const payload = await sessionResponse.json();
      if (payload.session) {
        await client.auth.setSession(payload.session);
      }
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Login failed. Please try again.");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      toast.error("Access denied. Admin only.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    toast.success("Welcome Admin!");
    router.push('/fk-admin');
    setLoading(false);
  };

  return (
    <AuthCard
      title="Admin Login"
      subtitle="Authorized personnel only"
    >
      <form onSubmit={handleLogin} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Admin Email</Label>
          <Input id="email" name="email" type="email" className="h-11 rounded-xl" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" className="h-11 rounded-xl" required />
        </div>
        <Button type="submit" variant="premium" className="h-11 w-full rounded-xl" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </Button>
      </form>
    </AuthCard>
  );
}