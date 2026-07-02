"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { assertProfileVerified } from "@/lib/auth/guards";
import { gendersAreOpposite } from "@/lib/gender";
import { redactCvDataForBrowse } from "@/lib/cv-browse";
import { shouldShowWaliOnBrowseProfile } from "@/lib/cv-privacy";

export async function getBrowsableProfile(shortId: string) {
  const auth = await assertProfileVerified();
  if (!auth.ok) {
    return { ok: false as const, message: auth.message };
  }

  const supabase = await createServerSupabaseClient();

  const { data: viewerProfile } = await supabase
    .from("profiles")
    .select("gender")
    .eq("id", auth.user.id)
    .maybeSingle();

  const { data: cv, error } = await supabase
    .from("cvs")
    .select("short_id, photo_url, data, user_id")
    .eq("short_id", shortId)
    .maybeSingle();

  if (error || !cv) {
    return { ok: false as const, message: "Profile not found" };
  }

  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("verification_status")
    .eq("id", cv.user_id)
    .maybeSingle();

  if (targetProfile?.verification_status !== "verified") {
    return { ok: false as const, message: "Profile not available" };
  }

  if (
    !gendersAreOpposite(
      viewerProfile?.gender,
      (cv.data as Record<string, string>)?.gender
    )
  ) {
    return { ok: false as const, message: "Profile not available" };
  }

  const cvData = (cv.data as Record<string, string>) || {};

  return {
    ok: true as const,
    cv: {
      short_id: cv.short_id,
      photo_url: cv.photo_url,
      data: redactCvDataForBrowse(cvData, {
        showWali: shouldShowWaliOnBrowseProfile(cvData),
      }),
    },
  };
}