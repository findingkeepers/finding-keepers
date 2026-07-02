'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { markTabSessionActive } from '@/lib/supabase/browser';
import { syncServerRecoverySession } from '@/lib/auth/recovery-session';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthCard } from '@/components/layout/AuthCard';
import { PasswordStrength } from '@/components/ui/password-strength';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';
import { validatePasswordPolicy } from '@/lib/password';
import { updateUserPassword } from '@/app/actions/auth';
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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    async function establishRecoverySession() {
      if (searchParams.get('error') === 'recovery_failed') {
        setErrorMessage(
          'This password reset link has expired or was already used. Request a new one.'
        );
        setState('error');
        router.replace('/reset-password', { scroll: false });
        return;
      }

      const code = searchParams.get('code');
      const token_hash = searchParams.get('token_hash');
      const type = searchParams.get('type');

      if (code || (token_hash && type === 'recovery')) {
        const params = new URLSearchParams();
        if (code) params.set('code', code);
        if (token_hash) params.set('token_hash', token_hash);
        if (type) params.set('type', type);
        window.location.replace(`/auth/recovery?${params.toString()}`);
        return;
      }

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

      const accessToken = hashParams?.get('access_token');
      const refreshToken = hashParams?.get('refresh_token');
      if (
        accessToken &&
        (hashParams?.get('type') === 'recovery' || type === 'recovery')
      ) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });

        if (!error && data.session) {
          const synced = await syncServerRecoverySession();
          if (synced) {
            setState('ready');
            window.history.replaceState(null, '', window.location.pathname);
            return;
          }
        }
      }

      if (await syncServerRecoverySession()) {
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
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') &&
        session
      ) {
        void syncServerRecoverySession().then((synced) => {
          if (synced) {
            setState('ready');
          }
        });
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

      const synced = await syncServerRecoverySession();
      if (!synced) {
        const message =
          'Your reset session has expired. Request a new password reset link.';
        setFormError(message);
        toast.error(message);
        return;
      }

      const result = await updateUserPassword(password);
      if (!result.ok) {
        setFormError(result.message);
        toast.error(result.message);
        return;
      }

      markTabSessionActive();

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