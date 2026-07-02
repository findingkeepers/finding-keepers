import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export type AuthGuardResult =
  | { ok: true; user: User; shortId?: string }
  | { ok: false; message: string; code: "unauthenticated" | "email_unverified" | "profile_unverified" | "forbidden" };

export async function assertAuthenticated(): Promise<AuthGuardResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      message: "You must be logged in",
      code: "unauthenticated",
    };
  }

  return { ok: true, user };
}

export async function assertEmailVerified(): Promise<AuthGuardResult> {
  const auth = await assertAuthenticated();
  if (!auth.ok) {
    return auth;
  }

  if (!auth.user.email_confirmed_at) {
    return {
      ok: false,
      message: "Please confirm your email before continuing",
      code: "email_unverified",
    };
  }

  return auth;
}

export async function assertProfileVerified(): Promise<AuthGuardResult> {
  const auth = await assertEmailVerified();
  if (!auth.ok) {
    return auth;
  }

  const supabase = await createServerSupabaseClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("verification_status")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (profile?.verification_status !== "verified") {
    return {
      ok: false,
      message: "Your account must be verified before using this feature",
      code: "profile_unverified",
    };
  }

  const { data: cv } = await supabase
    .from("cvs")
    .select("short_id")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  return { ok: true, user: auth.user, shortId: cv?.short_id ?? undefined };
}

export async function assertAdmin(): Promise<AuthGuardResult> {
  const auth = await assertEmailVerified();
  if (!auth.ok) {
    return auth;
  }

  const supabase = await createServerSupabaseClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") {
    return {
      ok: false,
      message: "Admin access required",
      code: "forbidden",
    };
  }

  return { ok: true, user: auth.user };
}