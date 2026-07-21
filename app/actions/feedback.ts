"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { assertAuthenticated } from "@/lib/auth/guards";

export async function submitPlatformFeedback({
  message,
  rating,
  category,
  source = "general",
}: {
  message: string;
  rating?: number | null;
  category?: string | null;
  source?: string;
}) {
  const auth = await assertAuthenticated();
  if (!auth.ok) {
    return { ok: false as const, message: auth.message };
  }

  const trimmed = message.trim();
  if (trimmed.length < 5) {
    return {
      ok: false as const,
      message: "Please share a bit more detail in your feedback.",
    };
  }

  if (trimmed.length > 2000) {
    return {
      ok: false as const,
      message: "Feedback is too long (max 2000 characters).",
    };
  }

  const normalizedRating =
    typeof rating === "number" && rating >= 1 && rating <= 5
      ? Math.round(rating)
      : null;

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("platform_feedback").insert({
    user_id: auth.user.id,
    message: trimmed,
    rating: normalizedRating,
    category: category?.trim() || null,
    source: source || "general",
  });

  if (error) {
    console.error("Platform feedback insert error:", error);
    return {
      ok: false as const,
      message: "Could not submit feedback. Please try again.",
    };
  }

  return { ok: true as const, message: "Thank you for your feedback." };
}
