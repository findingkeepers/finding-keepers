import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const PROFILE_PHOTOS_BUCKET = "profile-photos";
export const PROFILE_PHOTO_SIGNED_URL_TTL_SECONDS = 60 * 60;

const STORAGE_PATH_MARKER = "/profile-photos/";

export function getProfilePhotoStoragePath(
  stored: string | null | undefined
): string | null {
  if (!stored?.trim()) {
    return null;
  }

  const trimmed = stored.trim();

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    const index = trimmed.indexOf(STORAGE_PATH_MARKER);
    if (index === -1) {
      return null;
    }

    return decodeURIComponent(
      trimmed.slice(index + STORAGE_PATH_MARKER.length).split("?")[0] || ""
    );
  }

  return trimmed.split("?")[0] || null;
}

export async function createProfilePhotoSignedUrl(
  client: SupabaseClient,
  stored: string | null | undefined
): Promise<string | null> {
  const path = getProfilePhotoStoragePath(stored);
  if (!path) {
    return null;
  }

  const { data, error } = await client.storage
    .from(PROFILE_PHOTOS_BUCKET)
    .createSignedUrl(path, PROFILE_PHOTO_SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    console.error("Profile photo signed URL error:", error);
    return null;
  }

  return data.signedUrl;
}

/**
 * Issues a signed URL via service role after the app has already authorized access.
 * Used so unblurred originals are never readable through client-side storage RLS.
 */
export async function createAuthorizedProfilePhotoSignedUrl(
  stored: string | null | undefined
): Promise<string | null> {
  const admin = createAdminSupabaseClient();
  if (!admin) {
    return null;
  }

  return createProfilePhotoSignedUrl(admin, stored);
}