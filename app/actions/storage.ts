"use server";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { assertAdmin } from "@/lib/auth/guards";

export async function getVerificationSignedUrl(path: string) {
  const adminCheck = await assertAdmin();
  if (!adminCheck.ok) {
    return { ok: false as const, message: adminCheck.message };
  }

  if (!path?.trim()) {
    return { ok: false as const, message: "Missing file path" };
  }

  const admin = createAdminSupabaseClient();
  if (!admin) {
    return {
      ok: false as const,
      message: "Server configuration is incomplete",
    };
  }

  const { data, error } = await admin.storage
    .from("verifications")
    .createSignedUrl(path, 60 * 15);

  if (error || !data?.signedUrl) {
    console.error("Signed URL error:", error);
    return { ok: false as const, message: "Could not load document" };
  }

  return { ok: true as const, url: data.signedUrl };
}