"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { assertProfileVerified } from "@/lib/auth/guards";
import { gendersAreOpposite, profileGenderToCVGender } from "@/lib/gender";
import { pickBrowseListData, redactCvDataForBrowse } from "@/lib/cv-browse";
import { shouldShowWaliOnBrowseProfile } from "@/lib/cv-privacy";
import { createAuthorizedProfilePhotoSignedUrl } from "@/lib/profile-photo";
import {
  pairHasPhotoUnlock,
  PHOTO_UNLOCK_MATCH_STATUSES,
  resolvePhotoAccess,
} from "@/lib/photo-privacy";

type OwnerProfile = {
  gender: string | null;
  verification_status: string | null;
  browse_visible?: boolean | null;
};

type CvWithOwnerProfile = {
  short_id: string;
  photo_url: string | null;
  photo_blur_url?: string | null;
  data: Record<string, string> | null;
  user_id: string;
  profiles: OwnerProfile | OwnerProfile[] | null;
};

function getOwnerProfile(
  profiles: CvWithOwnerProfile["profiles"]
): OwnerProfile | null {
  if (!profiles) {
    return null;
  }

  return Array.isArray(profiles) ? profiles[0] ?? null : profiles;
}

export type BrowsableProfileSummary = {
  short_id: string;
  photo_url: string | null;
  photoIsBlurred?: boolean;
  age?: string;
  ageRange?: string;
  height?: string;
  occupation?: string;
  education?: string;
  ethnicBackground?: string;
  residencyStatus?: string;
};

async function loadViewerUnlockPairs(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  viewerUserId: string
) {
  const { data: myCv } = await supabase
    .from("cvs")
    .select("short_id")
    .eq("user_id", viewerUserId)
    .maybeSingle();

  const myShortId = myCv?.short_id as string | undefined;
  if (!myShortId) {
    return {
      myShortId: null as string | null,
      unlockRequests: [] as Array<{
        male_short_id: string;
        female_short_id: string;
        status: string;
      }>,
      activePartnerShortId: null as string | null,
    };
  }

  const { data: unlockRequests } = await supabase
    .from("match_requests")
    .select("male_short_id, female_short_id, status")
    .or(`male_short_id.eq.${myShortId},female_short_id.eq.${myShortId}`)
    .in("status", [...PHOTO_UNLOCK_MATCH_STATUSES]);

  const { data: viewerProfile } = await supabase
    .from("profiles")
    .select("active_introduction_request_id")
    .eq("id", viewerUserId)
    .maybeSingle();

  let activePartnerShortId: string | null = null;
  const activeRequestId = viewerProfile?.active_introduction_request_id;

  if (activeRequestId) {
    const { data: activeMatch } = await supabase
      .from("match_requests")
      .select("male_short_id, female_short_id, status")
      .eq("id", activeRequestId)
      .maybeSingle();

    if (activeMatch && activeMatch.status === "active") {
      if (activeMatch.male_short_id === myShortId) {
        activePartnerShortId = activeMatch.female_short_id;
      } else if (activeMatch.female_short_id === myShortId) {
        activePartnerShortId = activeMatch.male_short_id;
      }
    }
  }

  return {
    myShortId,
    unlockRequests: (unlockRequests ?? []) as Array<{
      male_short_id: string;
      female_short_id: string;
      status: string;
    }>,
    activePartnerShortId,
  };
}

async function resolveBrowsePhotoForViewer({
  cv,
  canSeeUnblurred,
}: {
  cv: {
    photo_url: string | null;
    photo_blur_url?: string | null;
    data: Record<string, string> | null;
  };
  canSeeUnblurred: boolean;
}) {
  const cvData = (cv.data as Record<string, string>) || {};
  const blurPath =
    cv.photo_blur_url?.trim() ||
    cvData.photoBlurUrl?.trim() ||
    null;

  const access = resolvePhotoAccess({
    photoVisibility: cvData.photoVisibility,
    canSeeUnblurred,
    originalPath: cv.photo_url,
    blurPath,
  });

  if (!access.storagePath) {
    return {
      photo_url: null as string | null,
      photoIsBlurred: access.isBlurred,
    };
  }

  return {
    photo_url: await createAuthorizedProfilePhotoSignedUrl(access.storagePath),
    photoIsBlurred: access.isBlurred,
  };
}

export async function getBrowsableProfiles() {
  const auth = await assertProfileVerified();
  if (!auth.ok) {
    return { ok: false as const, message: auth.message, code: auth.code };
  }

  const supabase = await createServerSupabaseClient();

  const { data: viewerProfile } = await supabase
    .from("profiles")
    .select("gender, role")
    .eq("id", auth.user.id)
    .maybeSingle();

  const isAdmin = viewerProfile?.role === "admin";
  const { myShortId, unlockRequests, activePartnerShortId } =
    await loadViewerUnlockPairs(supabase, auth.user.id);

  const { data: cvs, error } = await supabase
    .from("cvs")
    .select(
      "short_id, photo_url, photo_blur_url, data, user_id, profiles!inner(gender, verification_status, browse_visible)"
    )
    .neq("user_id", auth.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Browse list error:", error);
    return { ok: false as const, message: "Could not load profiles" };
  }

  const filteredCvs = ((cvs ?? []) as unknown as CvWithOwnerProfile[]).filter(
    (cv) => {
      const ownerProfile = getOwnerProfile(cv.profiles);

      if (ownerProfile?.verification_status !== "verified") {
        return false;
      }

      if (isAdmin) {
        return true;
      }

      // Active introduction: viewer may only browse their active partner
      // (partner is still viewable even though browse_visible is false for others).
      if (activePartnerShortId) {
        return cv.short_id === activePartnerShortId;
      }

      // Hidden from everyone else while in an active introduction.
      if (ownerProfile?.browse_visible === false) {
        return false;
      }

      return gendersAreOpposite(viewerProfile?.gender, ownerProfile?.gender);
    }
  );

  const profiles: BrowsableProfileSummary[] = await Promise.all(
    filteredCvs.map(async (cv) => {
      const cvData = (cv.data as Record<string, string>) || {};
      const ownerGender = profileGenderToCVGender(
        getOwnerProfile(cv.profiles)?.gender
      );
      const listData = pickBrowseListData({
        ...cvData,
        ...(ownerGender ? { gender: ownerGender } : {}),
      });

      const canSeeUnblurred =
        isAdmin ||
        (Boolean(myShortId) &&
          pairHasPhotoUnlock(unlockRequests, myShortId!, cv.short_id));

      const photo = await resolveBrowsePhotoForViewer({
        cv,
        canSeeUnblurred,
      });

      return {
        short_id: cv.short_id,
        ...photo,
        ...listData,
      };
    })
  );

  return { ok: true as const, profiles, isAdmin };
}

export async function getBrowsableProfile(shortId: string) {
  const auth = await assertProfileVerified();
  if (!auth.ok) {
    return { ok: false as const, message: auth.message };
  }

  const supabase = await createServerSupabaseClient();

  const { data: viewerProfile } = await supabase
    .from("profiles")
    .select("gender, role")
    .eq("id", auth.user.id)
    .maybeSingle();

  const isAdmin = viewerProfile?.role === "admin";
  const { myShortId, unlockRequests, activePartnerShortId } =
    await loadViewerUnlockPairs(supabase, auth.user.id);

  const { data: cv, error } = await supabase
    .from("cvs")
    .select(
      "short_id, photo_url, photo_blur_url, data, user_id, profiles!inner(gender, verification_status, browse_visible)"
    )
    .eq("short_id", shortId)
    .maybeSingle();

  if (error || !cv) {
    return { ok: false as const, message: "Profile not found" };
  }

  const targetProfile = getOwnerProfile(
    (cv as unknown as CvWithOwnerProfile).profiles
  );

  if (targetProfile?.verification_status !== "verified") {
    return { ok: false as const, message: "Profile not available" };
  }

  const isActivePartner =
    Boolean(activePartnerShortId) && shortId === activePartnerShortId;

  // Active introduction: only the partner's profile is accessible.
  if (!isAdmin && activePartnerShortId && !isActivePartner) {
    return {
      ok: false as const,
      message:
        "You are in an active introduction. You can only view that member's profile for now.",
    };
  }

  // Partner remains viewable even while browse_visible is false for others.
  if (
    !isAdmin &&
    !isActivePartner &&
    targetProfile?.browse_visible === false
  ) {
    return { ok: false as const, message: "Profile not available" };
  }

  if (
    !isAdmin &&
    !isActivePartner &&
    !gendersAreOpposite(viewerProfile?.gender, targetProfile?.gender)
  ) {
    return { ok: false as const, message: "Profile not available" };
  }

  const cvData = (cv.data as Record<string, string>) || {};
  const ownerGender = profileGenderToCVGender(targetProfile?.gender);
  const normalizedCvData = {
    ...cvData,
    ...(ownerGender ? { gender: ownerGender } : {}),
  };

  const canSeeUnblurred =
    isAdmin ||
    (Boolean(myShortId) &&
      pairHasPhotoUnlock(unlockRequests, myShortId!, cv.short_id));

  const photo = await resolveBrowsePhotoForViewer({
    cv: cv as {
      photo_url: string | null;
      photo_blur_url?: string | null;
      data: Record<string, string> | null;
    },
    canSeeUnblurred,
  });

  return {
    ok: true as const,
    cv: {
      short_id: cv.short_id,
      photo_url: photo.photo_url,
      photoIsBlurred: photo.photoIsBlurred,
      data: redactCvDataForBrowse(normalizedCvData, {
        showWali: shouldShowWaliOnBrowseProfile(normalizedCvData),
      }),
    },
    isAdmin,
    canRequestMatch:
      !isAdmin &&
      gendersAreOpposite(viewerProfile?.gender, targetProfile?.gender),
    photoUnlocked: canSeeUnblurred,
  };
}
