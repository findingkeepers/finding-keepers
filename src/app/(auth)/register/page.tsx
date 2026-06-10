'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        email,
        full_name,
        gender,
        phone,
        is_permanent_resident,
      });

      if (profileError) {
        toast.error("Failed to create profile");
      } else {
        toast.success("Account created! Please check your email to verify.");
        router.push('/login');
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Finding Keepers</h1>
          <p className="text-gray-600 mt-2">Create your account</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-5">
          <div>
            <Label>Full Name</Label>
            <Input name="full_name" placeholder="Ahmed Khan" required />
          </div>

          <div>
            <Label>Email Address</Label>
            <Input name="email" type="email" placeholder="you@example.com" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Password</Label>
              <Input name="password" type="password" required minLength={6} />
            </div>
            <div>
              <Label>Confirm Password</Label>
              <Input name="confirmPassword" type="password" required minLength={6} />
            </div>
          </div>

          <div>
            <Label>Gender</Label>
            <select name="gender" required className="w-full border rounded-md p-2.5">
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>

          <div>
            <Label>Phone Number</Label>
            <Input name="phone" type="tel" placeholder="+852 XXXX XXXX" required />
          </div>

          <div>
            <Label>Are you a Hong Kong Permanent Resident?</Label>
            <select name="is_permanent_resident" required className="w-full border rounded-md p-2.5">
              <option value="">Select</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>

          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading ? "Creating Account..." : "Create Account"}
          </Button>
        </form>

        <p className="text-center text-sm mt-6 text-gray-600">
          Already have an account?{" "}
          <a href="/login" className="text-blue-600 hover:underline">Login here</a>
        </p>
      </div>
    </div>
  );
}