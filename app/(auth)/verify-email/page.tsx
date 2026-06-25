'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthCard } from '@/components/layout/AuthCard';
import { toast } from 'sonner';

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp.trim(),
      type: 'signup',
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success("Email verified successfully!");
    router.push('/login');
    setLoading(false);
  };

  const handleResend = async () => {
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setResending(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("A new verification code has been sent");
    }
    setResending(false);
  };

  return (
    <AuthCard
      title="Verify Your Email"
      subtitle="Enter the 6-digit code sent to your inbox"
      footer={
        <p className="text-muted-foreground">
          Wrong email?{' '}
          <Link href="/register" className="font-medium text-fk-plum hover:text-fk-mauve">
            Register again
          </Link>
        </p>
      }
    >
      <form onSubmit={handleVerify} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            className="h-11 rounded-xl"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="otp">Verification Code</Label>
          <Input
            id="otp"
            inputMode="numeric"
            placeholder="123456"
            className="h-11 rounded-xl tracking-widest"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
            minLength={6}
            maxLength={8}
          />
        </div>
        <Button type="submit" variant="premium" className="h-11 w-full rounded-xl" disabled={loading}>
          {loading ? "Verifying..." : "Verify Email"}
        </Button>
        <Button
          type="button"
          variant="premium-outline"
          className="h-11 w-full rounded-xl"
          onClick={handleResend}
          disabled={resending}
        >
          {resending ? "Sending..." : "Resend Code"}
        </Button>
      </form>
    </AuthCard>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <VerifyEmailForm />
    </Suspense>
  );
}