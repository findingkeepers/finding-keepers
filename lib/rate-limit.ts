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

const loggedWarnings = new Set<string>();

function warnOnce(key: string, message: string) {
  if (loggedWarnings.has(key)) {
    return;
  }
  loggedWarnings.add(key);
  console.warn(message);
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

function isMissingRateLimitTable(error: { code?: string; message?: string }) {
  return (
    error.code === "42P01" ||
    error.message?.includes("auth_rate_limits") ||
    error.message?.includes("does not exist")
  );
}

export async function checkRateLimit(
  action: RateLimitAction,
  identifier: string
): Promise<
  | { ok: true }
  | { ok: false; message: string; retryAfterMinutes: number }
> {
  const admin = createAdminSupabaseClient();
  if (!admin) {
    warnOnce(
      "missing-service-role",
      "Rate limiting skipped: SUPABASE_SERVICE_ROLE_KEY is not set."
    );
    return { ok: true };
  }

  const ip = await getClientIp();
  const bucketKey = buildBucketKey(action, identifier, ip);
  const { maxAttempts, windowMinutes } = LIMITS[action];
  const windowMs = windowMinutes * 60 * 1000;
  const now = Date.now();

  const { data: existing, error: fetchError } = await admin
    .from("auth_rate_limits")
    .select("attempt_count, window_start")
    .eq("bucket_key", bucketKey)
    .maybeSingle();

  if (fetchError) {
    console.error("Rate limit fetch error:", fetchError);
    if (isMissingRateLimitTable(fetchError)) {
      warnOnce(
        "missing-rate-limit-table",
        "Rate limiting skipped: run section 7 of supabase/setup.sql to create auth_rate_limits."
      );
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
  const admin = createAdminSupabaseClient();
  if (!admin) {
    return;
  }

  const ip = await getClientIp();
  const bucketKey = buildBucketKey(action, identifier, ip);
  const { windowMinutes } = LIMITS[action];
  const windowMs = windowMinutes * 60 * 1000;
  const now = new Date().toISOString();

  const { data: existing, error: fetchError } = await admin
    .from("auth_rate_limits")
    .select("attempt_count, window_start")
    .eq("bucket_key", bucketKey)
    .maybeSingle();

  if (fetchError) {
    return;
  }

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