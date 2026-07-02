'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthCard } from '@/components/layout/AuthCard';
import { PasswordStrength } from '@/components/ui/password-strength';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';
import { validatePasswordPolicy } from '@/lib/password';
import {
  exchangeRecoveryCode,
  updateUserPassword,
  verifyRecoveryToken,
} from '@/app/actions/auth';
import { toast } from 'sonner';

type PageState = 'loading' | 'ready' | 'error';

function parseHashParams() {
  if (!window.location.hash) return null;
  return new URLSearchParams(window.location.hash.slice(1));
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ran = useRef(false);
  const [state, setState] = useState<PageState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    async function establishRecoverySession() {
      const hashParams = parseHashParams();

      if (hashParams?.get('error')) {
        const errorCode = hashParams.get('error_code');
        const description = hashParams
          .get('error_description')
          ?.replace(/\+/g, ' ');

        if (errorCode === 'otp_expired') {
          setErrorMessage(
            'This password reset link has expired or was already used. Request a new one.'
          );
        } else {
          setErrorMessage(
            description || 'This password reset link is invalid.'
          );
        }

        setState('error');
        window.history.replaceState(null, '', window.location.pathname);
        return;
      }

      const code = searchParams.get('code');
      let token_hash = searchParams.get('token_hash');
      let type = searchParams.get('type');

      if (hashParams) {
        token_hash = token_hash || hashParams.get('token_hash');
        type = type || hashParams.get('type');
      }

      if (code) {
        const result = await exchangeRecoveryCode(code);
        if (!result.ok) {
          setErrorMessage(
            result.message || 'Password reset link expired or invalid.'
          );
          setState('error');
          router.replace('/reset-password', { scroll: false });
          return;
        }
      } else if (token_hash && type === 'recovery') {
        const result = await verifyRecoveryToken(token_hash);
        if (!result.ok) {
          setErrorMessage(
            result.message || 'Password reset link expired or invalid.'
          );
          setState('error');
          return;
        }
      }

      const accessToken = hashParams?.get('access_token');
      const refreshToken = hashParams?.get('refresh_token');
      if (accessToken && (type === 'recovery' || hashParams?.get('type') === 'recovery')) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });

        if (!error && data.session) {
          setState('ready');
          window.history.replaceState(null, '', window.location.pathname);
          return;
        }
      }

      const sessionResponse = await fetch('/api/auth/session', {
        credentials: 'include',
        cache: 'no-store',
      });

      if (sessionResponse.ok) {
        const payload = await sessionResponse.json();
        if (payload.session) {
          await supabase.auth.setSession(payload.session);
          setState('ready');
          if (code) {
            router.replace('/reset-password', { scroll: false });
          }
          return;
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setState('ready');
        return;
      }

      timeoutId = setTimeout(() => {
        setErrorMessage(
          'Open the password reset link from your email to continue.'
        );
        setState('error');
      }, 4000);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setState('ready');
      }
    });

    void establishRecoverySession();

    return () => {
      subscription.unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [router, searchParams]);

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
      toast.error('Passwords do not match');
      return;
    }

    setSubmitting(true);

    const sessionResponse = await fetch('/api/auth/session', {
      credentials: 'include',
      cache: 'no-store',
    });

    if (sessionResponse.ok) {
      const result = await updateUserPassword(password);
      if (!result.ok) {
        toast.error(result.message);
        setSubmitting(false);
        return;
      }
    } else {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message);
        setSubmitting(false);
        return;
      }
    }

    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    await supabase.auth.signOut();
    toast.success('Password updated successfully!');
    router.push('/login');
    setSubmitting(false);
  };

  if (state === 'loading') {
    return <LoadingSpinner fullScreen message="Verifying reset link..." />;
  }

  if (state === 'error') {
    return (
      <AuthCard
        title="Reset Password"
        subtitle="We could not verify your reset link"
      >
        <p className="text-center text-sm text-muted-foreground">
          {errorMessage}
        </p>
        <Button
          asChild
          variant="premium"
          className="mt-6 h-11 w-full rounded-xl"
        >
          <Link href="/forgot-password">Request a new reset link</Link>
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Set New Password"
      subtitle="Choose a strong password for your account"
    >
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
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            className="h-11 rounded-xl"
            required
          />
        </div>
        <Button
          type="submit"
          variant="premium"
          className="h-11 w-full rounded-xl"
          disabled={submitting}
        >
          {submitting ? 'Updating...' : 'Update Password'}
        </Button>
      </form>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={<LoadingSpinner fullScreen message="Verifying reset link..." />}
    >
      <ResetPasswordContent />
    </Suspense>
  );
}