'use client';

import Link from 'next/link';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthCard } from '@/components/layout/AuthCard';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/reset-password`,
    });

    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
      toast.success("Password reset link sent to your email");
    }

    setLoading(false);
  };

  return (
    <AuthCard
      title="Forgot Password"
      subtitle="We'll send you a link to reset your password"
      footer={
        <Link href="/login" className="font-medium text-fk-plum hover:text-fk-mauve">
          Back to login
        </Link>
      }
    >
      {sent ? (
        <p className="text-center text-sm text-muted-foreground">
          Check your inbox for a password reset link. If you don&apos;t see it, check your spam folder.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" name="email" type="email" className="h-11 rounded-xl" required />
          </div>
          <Button type="submit" variant="premium" className="h-11 w-full rounded-xl" disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}