"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { assertProfileVerified } from "@/lib/auth/guards";
import { gendersAreOpposite } from "@/lib/gender";
import { pickBrowseListData, redactCvDataForBrowse } from "@/lib/cv-browse";
import { shouldShowWaliOnBrowseProfile } from "@/lib/cv-privacy";
import { createProfilePhotoSignedUrl } from "@/lib/profile-photo";

export type BrowsableProfileSummary = {
  short_id: string;
  photo_url: string | null;
  occupation?: string;
  education?: string;
  ethnicBackground?: string;
  residencyStatus?: string;
};

export async function getBrowsableProfiles() {
  const auth = await assertProfileVerified();
  if (!auth.ok) {
    return { ok: false as const, message: auth.message, code: auth.code };
  }

  const supabase = await createServerSupabaseClient();

  const { data: viewerProfile } = await supabase
    .from("profiles")
    .select("gender")
    .eq("id", auth.user.id)
    .maybeSingle();

  const { data: cvs, error } = await supabase
    .from("cvs")
    .select("short_id, photo_url, data, user_id")
    .neq("user_id", auth.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Browse list error:", error);
    return { ok: false as const, message: "Could not load profiles" };
  }

  const filteredCvs = (cvs ?? []).filter((cv) =>
    gendersAreOpposite(
      viewerProfile?.gender,
      (cv.data as Record<string, string>)?.gender
    )
  );

  const profiles: BrowsableProfileSummary[] = await Promise.all(
    filteredCvs.map(async (cv) => {
      const listData = pickBrowseListData(
        (cv.data as Record<string, string>) || {}
      );

      return {
        short_id: cv.short_id,
        photo_url: await createProfilePhotoSignedUrl(supabase, cv.photo_url),
        ...listData,
      };
    })
  );

  return { ok: true as const, profiles };
}

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
      photo_url: await createProfilePhotoSignedUrl(supabase, cv.photo_url),
      data: redactCvDataForBrowse(cvData, {
        showWali: shouldShowWaliOnBrowseProfile(cvData),
      }),
    },
  };
}