import { headers } from "next/headers";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type RateLimitPolicy = {
  /** Human-readable action name shown in error messages. */
  label: string;
  maxRequests: number;
  /** Fixed window length in seconds. Limit resets when this window elapses. */
  windowSeconds: number;
};

/** Documented limits — fixed window resets after `windowSeconds` from the first attempt in that window. */
export const RATE_LIMITS = {
  login: {
    perIp: {
      label: "login",
      maxRequests: 10,
      windowSeconds: 15 * 60,
    },
    perEmail: {
      label: "login",
      maxRequests: 5,
      windowSeconds: 15 * 60,
    },
  },
  register: {
    perIp: {
      label: "registration",
      maxRequests: 3,
      windowSeconds: 60 * 60,
    },
  },
  passwordReset: {
    perIp: {
      label: "password reset",
      maxRequests: 5,
      windowSeconds: 60 * 60,
    },
    perEmail: {
      label: "password reset",
      maxRequests: 3,
      windowSeconds: 60 * 60,
    },
  },
  resendConfirmation: {
    perIp: {
      label: "confirmation resend",
      maxRequests: 5,
      windowSeconds: 60 * 60,
    },
    perEmail: {
      label: "confirmation resend",
      maxRequests: 3,
      windowSeconds: 60 * 60,
    },
  },
} as const;

export type RateLimitCheck =
  | { allowed: true }
  | { allowed: false; message: string; retryAfterSeconds: number };

type RateLimitBucketInput = {
  scope: string;
  identifier: string;
  policy: RateLimitPolicy;
};

function normalizeBucketIdentifier(value: string) {
  return value.trim().toLowerCase();
}

function buildBucketKey(scope: string, identifier: string) {
  return `${scope}:${normalizeBucketIdentifier(identifier)}`;
}

export async function getClientIp() {
  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for");

  if (forwarded) {
    const firstHop = forwarded.split(",")[0]?.trim();
    if (firstHop) {
      return firstHop;
    }
  }

  return headerStore.get("x-real-ip")?.trim() || "unknown";
}

function formatRetryMessage(label: string, retryAfterSeconds: number) {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));

  if (minutes === 1) {
    return `Too many ${label} attempts. Try again in about 1 minute.`;
  }

  return `Too many ${label} attempts. Try again in about ${minutes} minutes.`;
}

async function checkRateLimitBucket(
  bucketKey: string,
  policy: RateLimitPolicy
): Promise<RateLimitCheck> {
  const admin = createAdminSupabaseClient();
  if (!admin) {
    console.error("Rate limit skipped: SUPABASE_SERVICE_ROLE_KEY is not configured.");
    return { allowed: true };
  }

  const { data, error } = await admin.rpc("check_rate_limit", {
    p_bucket_key: bucketKey,
    p_max_requests: policy.maxRequests,
    p_window_seconds: policy.windowSeconds,
  });

  if (error) {
    console.error("Rate limit RPC error:", error);
    return { allowed: true };
  }

  const allowed = data?.allowed === true;
  const retryAfterSeconds =
    typeof data?.retry_after_seconds === "number"
      ? Math.max(0, data.retry_after_seconds)
      : 0;

  if (allowed) {
    return { allowed: true };
  }

  return {
    allowed: false,
    message: formatRetryMessage(policy.label, retryAfterSeconds),
    retryAfterSeconds,
  };
}

export async function enforceRateLimits(
  buckets: RateLimitBucketInput[]
): Promise<RateLimitCheck> {
  for (const bucket of buckets) {
    const identifier = bucket.identifier.trim();
    if (!identifier) {
      continue;
    }

    const result = await checkRateLimitBucket(
      buildBucketKey(bucket.scope, identifier),
      bucket.policy
    );

    if (!result.allowed) {
      return result;
    }
  }

  return { allowed: true };
}