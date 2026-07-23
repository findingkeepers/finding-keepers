'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { useDashboardMenu } from '@/components/dashboard/DashboardLayoutProvider';
import { submitPlatformFeedback } from '@/app/actions/feedback';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function ShareFeedbackPage() {
  const router = useRouter();
  const { onMenuClick } = useDashboardMenu();
  const [rating, setRating] = useState<number | null>(null);
  const [category, setCategory] = useState('general');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);

    const result = await submitPlatformFeedback({
      message,
      rating,
      category,
      source: 'dashboard',
    });

    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
    setMessage('');
    setRating(null);
    setCategory('general');
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Share Feedback"
        subtitle="Tell us what is working and what we should improve."
        eyebrow="Your Voice"
        onMenuClick={onMenuClick}
        actions={
          <Button
            variant="premium-outline"
            className="rounded-xl"
            onClick={() => router.push('/dashboard')}
          >
            ← Dashboard
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label>Overall rating (optional)</Label>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    className={cn(
                      'flex size-10 cursor-pointer items-center justify-center rounded-xl border text-sm font-semibold transition-colors',
                      rating === value
                        ? 'border-fk-plum bg-fk-plum text-fk-cream'
                        : 'border-fk-gold/30 bg-white/70 text-fk-plum hover:border-fk-gold/50'
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-category">Topic</Label>
              <Select
                id="feedback-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="general">General experience</option>
                <option value="verification">Verification</option>
                <option value="cv_builder">CV Builder</option>
                <option value="browse_matching">Browse & matching</option>
                <option value="privacy">Privacy & photos</option>
                <option value="other">Other</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-message">Your feedback</Label>
              <Textarea
                id="feedback-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder="What worked well? What should we improve?"
                required
              />
            </div>

            <Button
              type="submit"
              variant="premium"
              className="h-11 w-full rounded-xl"
              disabled={submitting}
            >
              {submitting ? 'Sending...' : 'Submit feedback'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
