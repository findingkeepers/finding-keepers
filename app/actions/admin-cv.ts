"use server";

import { assertAdmin } from "@/lib/auth/guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getProfilePhotoStoragePath } from "@/lib/profile-photo";

export async function adminDeleteCv({ cvId }: { cvId: string }) {
  const adminCheck = await assertAdmin();
  if (!adminCheck.ok) {
    return { success: false as const, message: adminCheck.message };
  }

  if (!cvId?.trim()) {
    return { success: false as const, message: "Invalid CV id" };
  }

  const admin = createAdminSupabaseClient();
  if (!admin) {
    return {
      success: false as const,
      message: "Server configuration is incomplete",
    };
  }

  const { data: cv, error: fetchError } = await admin
    .from("cvs")
    .select("id, short_id, photo_url, photo_blur_url, user_id, data")
    .eq("id", cvId)
    .maybeSingle();

  if (fetchError || !cv) {
    return { success: false as const, message: "CV not found" };
  }

  const paths = [
    getProfilePhotoStoragePath(cv.photo_url),
    getProfilePhotoStoragePath(cv.photo_blur_url),
    getProfilePhotoStoragePath(
      (cv.data as Record<string, string> | null)?.photoBlurUrl
    ),
  ].filter((path): path is string => Boolean(path));

  if (paths.length > 0) {
    const { error: storageError } = await admin.storage
      .from("profile-photos")
      .remove(paths);

    if (storageError) {
      console.error("Admin CV photo cleanup error:", storageError);
    }
  }

  const { error: deleteError } = await admin
    .from("cvs")
    .delete()
    .eq("id", cvId);

  if (deleteError) {
    console.error("Admin CV delete error:", deleteError);
    return { success: false as const, message: "Failed to delete CV" };
  }

  return {
    success: true as const,
    message: `CV ${cv.short_id} deleted successfully.`,
  };
}
