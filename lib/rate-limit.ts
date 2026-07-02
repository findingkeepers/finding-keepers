import { headers } from "next/headers";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type RateLimitAction =
  | "login"
  | "signup"
  | "password_reset"
  | "phone_check";

const LIMITS: Record<
  RateLimitAction,
  { maxAttempts: number; windowMinutes: number }
> = {
  login: { maxAttempts: 5, windowMinutes: 15 },
  signup: { maxAttempts: 5, windowMinutes: 15 },
  password_reset: { maxAttempts: 5, windowMinutes: 15 },
  phone_check: { maxAttempts: 10, windowMinutes: 15 },
};

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function rateLimitUnavailableMessage() {
  return "Security checks are temporarily unavailable. Please try again shortly.";
}

export async function getClientIp() {
  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  return headerStore.get("x-real-ip")?.trim() || "unknown";
}

function buildBucketKey(action: RateLimitAction, identifier: string, ip: string) {
  const normalized = identifier.trim().toLowerCase();
  return `${action}:${ip}:${normalized}`;
}

async function getAdminOrFail() {
  const admin = createAdminSupabaseClient();
  if (!admin) {
    if (isProduction()) {
      return {
        ok: false as const,
        message: rateLimitUnavailableMessage(),
      };
    }
    return { ok: true as const, admin: null };
  }

  return { ok: true as const, admin };
}

export async function checkRateLimit(
  action: RateLimitAction,
  identifier: string
): Promise<
  | { ok: true }
  | { ok: false; message: string; retryAfterMinutes: number }
> {
  const adminResult = await getAdminOrFail();
  if (!adminResult.ok) {
    return {
      ok: false,
      message: adminResult.message,
      retryAfterMinutes: 15,
    };
  }

  if (!adminResult.admin) {
    return { ok: true };
  }

  const ip = await getClientIp();
  const bucketKey = buildBucketKey(action, identifier, ip);
  const { maxAttempts, windowMinutes } = LIMITS[action];
  const windowMs = windowMinutes * 60 * 1000;
  const now = Date.now();

  const { data: existing, error: fetchError } = await adminResult.admin
    .from("auth_rate_limits")
    .select("attempt_count, window_start")
    .eq("bucket_key", bucketKey)
    .maybeSingle();

  if (fetchError) {
    console.error("Rate limit fetch error:", fetchError);
    if (isProduction()) {
      return {
        ok: false,
        message: rateLimitUnavailableMessage(),
        retryAfterMinutes: 15,
      };
    }
    return { ok: true };
  }

  if (!existing) {
    return { ok: true };
  }

  const windowStart = new Date(existing.window_start).getTime();
  const withinWindow = now - windowStart < windowMs;

  if (withinWindow && existing.attempt_count >= maxAttempts) {
    const elapsedMinutes = Math.floor((now - windowStart) / 60000);
    const retryAfterMinutes = Math.max(1, windowMinutes - elapsedMinutes);

    return {
      ok: false,
      message: `Too many attempts. Please wait ${retryAfterMinutes} minute${
        retryAfterMinutes === 1 ? "" : "s"
      } and try again.`,
      retryAfterMinutes,
    };
  }

  return { ok: true };
}

export async function recordRateLimitAttempt(
  action: RateLimitAction,
  identifier: string
) {
  const adminResult = await getAdminOrFail();
  if (!adminResult.ok || !adminResult.admin) {
    return;
  }

  const admin = adminResult.admin;
  const ip = await getClientIp();
  const bucketKey = buildBucketKey(action, identifier, ip);
  const { windowMinutes } = LIMITS[action];
  const windowMs = windowMinutes * 60 * 1000;
  const now = new Date().toISOString();

  const { data: existing } = await admin
    .from("auth_rate_limits")
    .select("attempt_count, window_start")
    .eq("bucket_key", bucketKey)
    .maybeSingle();

  if (!existing) {
    await admin.from("auth_rate_limits").insert({
      bucket_key: bucketKey,
      attempt_count: 1,
      window_start: now,
    });
    return;
  }

  const windowStart = new Date(existing.window_start).getTime();
  const withinWindow = Date.now() - windowStart < windowMs;

  if (!withinWindow) {
    await admin
      .from("auth_rate_limits")
      .update({ attempt_count: 1, window_start: now })
      .eq("bucket_key", bucketKey);
    return;
  }

  await admin
    .from("auth_rate_limits")
    .update({ attempt_count: existing.attempt_count + 1 })
    .eq("bucket_key", bucketKey);
}

export async function recordRateLimitFailure(
  action: RateLimitAction,
  identifier: string
) {
  await recordRateLimitAttempt(action, identifier);
}

export async function clearRateLimit(
  action: RateLimitAction,
  identifier: string
) {
  const admin = createAdminSupabaseClient();
  if (!admin) {
    return;
  }

  const ip = await getClientIp();
  const bucketKey = buildBucketKey(action, identifier, ip);

  await admin.from("auth_rate_limits").delete().eq("bucket_key", bucketKey);
}