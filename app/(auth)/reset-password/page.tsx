'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { markTabSessionActive } from '@/lib/supabase/browser';
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

async function syncRecoverySession() {
  const sessionResponse = await fetch('/api/auth/session', {
    credentials: 'include',
    cache: 'no-store',
  });

  if (!sessionResponse.ok) return false;

  const payload = await sessionResponse.json();
  if (!payload.session) return false;

  const { error } = await supabase.auth.setSession(payload.session);
  if (error) return false;

  markTabSessionActive();
  return true;
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ran = useRef(false);
  const [state, setState] = useState<PageState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');
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
      if (
        accessToken &&
        (type === 'recovery' || hashParams?.get('type') === 'recovery')
      ) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });

        if (!error && data.session) {
          markTabSessionActive();
          setState('ready');
          window.history.replaceState(null, '', window.location.pathname);
          return;
        }
      }

      if (await syncRecoverySession()) {
        setState('ready');
        if (code) {
          router.replace('/reset-password', { scroll: false });
        }
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        markTabSessionActive();
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
        markTabSessionActive();
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
    setFormError('');
    setSubmitting(true);

    try {
      if (password !== confirmPassword) {
        const message = 'Passwords do not match';
        setFormError(message);
        toast.error(message);
        return;
      }

      const passwordCheck = await validatePasswordPolicy(password);
      if (!passwordCheck.ok) {
        setFormError(passwordCheck.message);
        toast.error(passwordCheck.message);
        return;
      }

      const hasSession = await syncRecoverySession();
      if (!hasSession) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          const message =
            'Your reset session has expired. Request a new password reset link.';
          setFormError(message);
          toast.error(message);
          return;
        }
      }

      const result = await updateUserPassword(password);
      if (!result.ok) {
        setFormError(result.message);
        toast.error(result.message);
        return;
      }

      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      await supabase.auth.signOut();

      toast.success('Password updated successfully! You can log in now.');
      window.location.replace('/login?reset=1');
    } catch (error) {
      console.error('Password reset error:', error);
      const message = 'Something went wrong. Please try again.';
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
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
        {formError ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {formError}
          </p>
        ) : null}

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
            disabled={submitting}
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
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={submitting}
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