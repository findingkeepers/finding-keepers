import { getEffectiveMatchStatus } from "@/lib/match-expiry";

export const MATCH_STATUS = {
  pending: "pending",
  interestReturned: "interest_returned",
  active: "active",
  rejected: "rejected",
  expired: "expired",
  withdrawn: "withdrawn",
  contacted: "contacted",
  completed: "completed",
  unmatched: "unmatched",
} as const;

export const INTEREST_QUOTA_STATUSES = [
  MATCH_STATUS.pending,
  MATCH_STATUS.interestReturned,
] as const;

export const SELECTION_WINDOW_HOURS = 48;

export function normalizeMatchStatus(status: string) {
  if (status === "approved") {
    return MATCH_STATUS.interestReturned;
  }

  return status;
}

export function getDisplayMatchStatus(
  status: string,
  createdAt: string,
  now: number = Date.now()
) {
  return normalizeMatchStatus(getEffectiveMatchStatus(status, createdAt));
}

export function permanentlyBlocksPair(status: string) {
  return normalizeMatchStatus(status) === MATCH_STATUS.rejected;
}

export function countsTowardInterestQuota(
  status: string,
  createdAt: string,
  now: number = Date.now()
) {
  const effectiveStatus = getDisplayMatchStatus(status, createdAt, now);
  return INTEREST_QUOTA_STATUSES.includes(
    effectiveStatus as (typeof INTEREST_QUOTA_STATUSES)[number]
  );
}

export function blocksNewRequestToPair(
  status: string,
  createdAt: string,
  now: number = Date.now()
) {
  const effectiveStatus = getDisplayMatchStatus(status, createdAt, now);

  if (effectiveStatus === MATCH_STATUS.rejected) {
    return true;
  }

  if (effectiveStatus === MATCH_STATUS.active) {
    return true;
  }

  return INTEREST_QUOTA_STATUSES.includes(
    effectiveStatus as (typeof INTEREST_QUOTA_STATUSES)[number]
  );
}

export function hasActiveIntroduction(profile: {
  active_introduction_request_id?: string | null;
  browse_visible?: boolean | null;
}) {
  return (
    Boolean(profile.active_introduction_request_id) ||
    profile.browse_visible === false
  );
}

export function getStatusLabel(status: string) {
  const normalized = normalizeMatchStatus(status);

  switch (normalized) {
    case MATCH_STATUS.interestReturned:
      return "Interest returned";
    case MATCH_STATUS.withdrawn:
      return "Closed";
    case MATCH_STATUS.active:
      return "Active introduction";
    case MATCH_STATUS.unmatched:
      return "Introduction ended";
    default:
      return normalized.replace(/_/g, " ");
  }
}