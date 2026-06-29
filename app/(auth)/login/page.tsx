'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { resendConfirmationEmail } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthCard } from '@/components/layout/AuthCard';
import { toast } from 'sonner';

function LoginForm() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showResendConfirmation, setShowResendConfirmation] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }

    if (searchParams.get('verified') === '1') {
      toast.success("Email confirmed! You can log in now.");
    }
    if (searchParams.get('check_email') === '1') {
      toast.message("Check your inbox", {
        description: "Click the confirmation link in your email, then log in here.",
      });
    }
    if (searchParams.get('pending_confirmation') === '1') {
      setShowResendConfirmation(true);
      toast.message("Account created — confirm your email", {
        description:
          "Your account exists but the confirmation email could not be sent yet. Use Resend confirmation below after domain setup, or register with findingkeepers@connecthk.org for testing.",
      });
    }
    if (searchParams.get('error') === 'confirmation_failed') {
      toast.error("Confirmation link expired or invalid. Try registering again or contact support.");
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setShowResendConfirmation(false);

    const formData = new FormData(e.currentTarget);
    const loginEmail = formData.get('email') as string;
    const loginPassword = formData.get('password') as string;

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    if (error) {
      const needsConfirmation =
        error.message.toLowerCase().includes('email not confirmed') ||
        error.message.toLowerCase().includes('not confirmed');

      if (needsConfirmation) {
        setShowResendConfirmation(true);
        toast.error("Please confirm your email before logging in.");
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success("Logged in successfully!");
      const next = searchParams.get('next');
      window.location.href =
        next && next.startsWith('/') ? next : '/dashboard';
    }
    setLoading(false);
  };

  const handleResendConfirmation = async () => {
    if (!email || !password) {
      toast.error("Enter your email and password, then try again.");
      return;
    }

    setResending(true);
    const result = await resendConfirmationEmail({ email, password });
    if (result.ok) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
    setResending(false);
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
          <Input
            id="email"
            name="email"
            type="email"
            className="h-11 rounded-xl"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-xs font-medium text-fk-mauve hover:text-fk-plum">
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            className="h-11 rounded-xl"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {showResendConfirmation && (
          <div className="rounded-xl border border-fk-gold/40 bg-fk-cream/60 p-4 text-sm text-fk-plum">
            <p className="mb-3">
              Your account exists but your email is not confirmed yet. Resend the confirmation link using the email and password above.
            </p>
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full rounded-xl"
              disabled={resending}
              onClick={handleResendConfirmation}
            >
              {resending ? "Sending..." : "Resend confirmation email"}
            </Button>
          </div>
        )}

        <Button type="submit" variant="premium" className="h-11 w-full rounded-xl" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </Button>
      </form>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}