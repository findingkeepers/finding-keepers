'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { AuthCard } from '@/components/layout/AuthCard';
import { toast } from 'sonner';

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
    const full_name = formData.get('full_name') as string;
    const gender = formData.get('gender') as string;
    const phone = formData.get('phone') as string;
    const is_permanent_resident = formData.get('is_permanent_resident') === 'yes';

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: full_name,
          gender: gender,
          phone: phone || '',
          is_permanent_resident: is_permanent_resident,
        }
      }
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Account created successfully! Please check your email to confirm.");
      router.push('/login');
    }

    setLoading(false);
  };

  return (
    <AuthCard
      title="Create Your Account"
      subtitle="Begin your journey with Finding Keepers"
      className="max-w-lg"
      footer={
        <p className="text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-fk-plum hover:text-fk-mauve">
            Login here
          </Link>
        </p>
      }
    >
      <form onSubmit={handleRegister} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="full_name">Full Name</Label>
          <Input id="full_name" name="full_name" placeholder="Ahmed Khan" className="h-11 rounded-xl" required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input id="email" name="email" type="email" placeholder="you@example.com" className="h-11 rounded-xl" required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" className="h-11 rounded-xl" required minLength={6} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input id="confirmPassword" name="confirmPassword" type="password" className="h-11 rounded-xl" required minLength={6} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="gender">Gender</Label>
          <Select id="gender" name="gender" required defaultValue="">
            <option value="" disabled>Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input id="phone" name="phone" type="tel" placeholder="+852 XXXX XXXX" className="h-11 rounded-xl" required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="is_permanent_resident">Are you a Hong Kong Permanent Resident?</Label>
          <Select id="is_permanent_resident" name="is_permanent_resident" required defaultValue="">
            <option value="" disabled>Select</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </Select>
        </div>

        <Button type="submit" variant="premium" className="h-11 w-full rounded-xl" disabled={loading}>
          {loading ? "Creating Account..." : "Create Account"}
        </Button>
      </form>
    </AuthCard>
  );
}