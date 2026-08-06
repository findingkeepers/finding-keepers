'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { submitContactForm } from '@/app/actions/contact';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { AuthCard } from '@/components/layout/AuthCard';
import { toast } from 'sonner';

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [topic, setTopic] = useState('general');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const prefill = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      if (user.email) {
        setEmail(user.email);
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.full_name) {
        setName(profile.full_name);
      }
      if (profile?.phone) {
        setPhone(profile.phone);
      }
    };

    void prefill();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    const result = await submitContactForm({
      name,
      email,
      phone,
      topic,
      message,
    });

    setLoading(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
    setMessage('');
    setTopic('general');
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <AuthCard
        title="Contact Us"
        subtitle="Tell us about a problem or question. We will reply by email."
        className="max-w-lg"
        footer={
          <p className="text-muted-foreground">
            Prefer email?{' '}
            <a
              href="mailto:findingkeepers@connecthk.org"
              className="font-medium text-fk-plum hover:text-fk-mauve"
            >
              findingkeepers@connecthk.org
            </a>
            {' · '}
            <Link href="/" className="font-medium text-fk-plum hover:text-fk-mauve">
              Home
            </Link>
          </p>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="contact-name">Full name</Label>
            <Input
              id="contact-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 rounded-xl"
              required
              autoComplete="name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-email">Email</Label>
            <Input
              id="contact-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-xl"
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-phone">Phone (optional)</Label>
            <PhoneInput
              id="contact-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-11 rounded-xl"
              placeholder="+852 XXXX XXXX"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-topic">Topic</Label>
            <Select
              id="contact-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
            >
              <option value="general">General question</option>
              <option value="account_access">Account / login</option>
              <option value="verification">Verification</option>
              <option value="matching">Matching / introductions</option>
              <option value="technical">Technical problem</option>
              <option value="privacy">Privacy / photos</option>
              <option value="other">Other</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-message">How can we help?</Label>
            <Textarea
              id="contact-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              required
              placeholder="Describe the issue, what you expected, and anything else we should know."
            />
          </div>

          <Button
            type="submit"
            variant="premium"
            className="h-11 w-full rounded-xl"
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send message'}
          </Button>
        </form>
      </AuthCard>
    </div>
  );
}
