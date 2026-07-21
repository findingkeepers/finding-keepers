"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { submitPlatformFeedback } from "@/app/actions/feedback";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type PlatformFeedbackDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source?: string;
  title?: string;
  description?: string;
};

export function PlatformFeedbackDialog({
  open,
  onOpenChange,
  source = "general",
  title = "How was your experience?",
  description = "Your feedback helps us improve Finding Keepers for everyone.",
}: PlatformFeedbackDialogProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);

    const result = await submitPlatformFeedback({
      message,
      rating,
      category,
      source,
    });

    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
    setMessage("");
    setRating(null);
    setCategory("general");
    onOpenChange(false);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close feedback dialog"
        className="absolute inset-0 bg-fk-plum/30 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-dialog-title"
        className="relative z-10 w-full max-w-lg rounded-2xl border border-fk-gold/25 bg-[#faf6f1] p-6 shadow-xl"
      >
        <h2
          id="feedback-dialog-title"
          className="font-heading text-2xl font-medium text-fk-plum"
        >
          {title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="space-y-2">
            <Label>Overall rating (optional)</Label>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  className={cn(
                    "flex size-10 cursor-pointer items-center justify-center rounded-xl border text-sm font-semibold transition-colors",
                    rating === value
                      ? "border-fk-plum bg-fk-plum text-fk-cream"
                      : "border-fk-gold/30 bg-white/70 text-fk-plum hover:border-fk-gold/50"
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
              rows={4}
              placeholder="What worked well? What should we improve?"
              required
            />
          </div>

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Skip for now
            </Button>
            <Button
              type="submit"
              variant="premium"
              className="rounded-xl"
              disabled={submitting}
            >
              {submitting ? "Sending..." : "Submit feedback"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
