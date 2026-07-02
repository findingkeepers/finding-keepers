"use server";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { assertEmailVerified } from "@/lib/auth/guards";
import { generateShortIdCandidate } from "@/lib/short-id";
import { profileGenderToCVGender } from "@/lib/gender";

export async function allocateUniqueShortId() {
  const auth = await assertEmailVerified();
  if (!auth.ok) {
    return { ok: false as const, message: auth.message };
  }

  const admin = createAdminSupabaseClient();
  if (!admin) {
    return { ok: false as const, message: "Server configuration is incomplete" };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("gender")
    .eq("id", auth.user.id)
    .maybeSingle();

  const cvGender = profileGenderToCVGender(profile?.gender);
  if (!cvGender) {
    return { ok: false as const, message: "Gender not set on your account" };
  }

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = generateShortIdCandidate(cvGender);
    const { data: existing } = await admin
      .from("cvs")
      .select("id")
      .eq("short_id", candidate)
      .maybeSingle();

    if (!existing) {
      return { ok: true as const, shortId: candidate };
    }
  }

  return {
    ok: false as const,
    message: "Could not allocate a unique profile ID. Please try again.",
  };
}