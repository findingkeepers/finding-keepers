'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthCard } from '@/components/layout/AuthCard';
import { PasswordStrength } from '@/components/ui/password-strength';
import { validatePasswordPolicy } from '@/lib/password';
import { updateUserPassword, verifyRecoveryToken } from '@/app/actions/auth';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function establishRecoverySession() {
      const params = new URLSearchParams(window.location.search);
      const token_hash = params.get("token_hash");
      const type = params.get("type");

      if (token_hash && type === "recovery") {
        const result = await verifyRecoveryToken(token_hash);

        if (!result.ok) {
          toast.error("Password reset link expired or invalid.");
          return;
        }
      }

      const sessionResponse = await fetch("/api/auth/session", {
        credentials: "include",
        cache: "no-store",
      });

      if (sessionResponse.ok) {
        const payload = await sessionResponse.json();
        if (payload.session) {
          await supabase.auth.setSession(payload.session);
          setReady(true);
          return;
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setReady(true);
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });

    void establishRecoverySession();

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const passwordCheck = await validatePasswordPolicy(password);
    if (!passwordCheck.ok) {
      toast.error(passwordCheck.message);
      return;
    }

    const formData = new FormData(e.currentTarget);
    const confirm = formData.get('confirmPassword') as string;

    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    const sessionResponse = await fetch("/api/auth/session", {
      credentials: "include",
      cache: "no-store",
    });

    if (sessionResponse.ok) {
      const result = await updateUserPassword(password);
      if (!result.ok) {
        toast.error(result.message);
        setLoading(false);
        return;
      }
    } else {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
    }

    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    await supabase.auth.signOut();
    toast.success("Password updated successfully!");
    router.push('/login');
    setLoading(false);
  };

  if (!ready) {
    return (
      <AuthCard title="Reset Password" subtitle="Open the link from your email to continue">
        <p className="text-center text-sm text-muted-foreground">
          This page must be opened from your password reset email.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Set New Password" subtitle="Choose a strong password for your account">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="password">New Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            className="h-11 rounded-xl"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <PasswordStrength password={password} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input id="confirmPassword" name="confirmPassword" type="password" className="h-11 rounded-xl" required />
        </div>
        <Button type="submit" variant="premium" className="h-11 w-full rounded-xl" disabled={loading}>
          {loading ? "Updating..." : "Update Password"}
        </Button>
      </form>
    </AuthCard>
  );
}