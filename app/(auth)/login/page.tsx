'use client';

import Link from 'next/link';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthCard } from '@/components/layout/AuthCard';
import { toast } from 'sonner';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Logged in successfully!");
      window.location.href = '/dashboard';
    }
    setLoading(false);
  };

  return (
    <AuthCard
      title="Welcome Back"
      subtitle="Sign in to continue your journey"
      footer={
        <p className="text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-medium text-fk-plum hover:text-fk-mauve">
            Register
          </Link>
        </p>
      }
    >
      <form onSubmit={handleLogin} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" className="h-11 rounded-xl" required />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-xs font-medium text-fk-mauve hover:text-fk-plum">
              Forgot password?
            </Link>
          </div>
          <Input id="password" name="password" type="password" className="h-11 rounded-xl" required />
        </div>

        <Button type="submit" variant="premium" className="h-11 w-full rounded-xl" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </Button>
      </form>
    </AuthCard>
  );
}