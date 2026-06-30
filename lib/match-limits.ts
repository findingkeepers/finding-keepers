import {
  getEffectiveMatchStatus,
  isPendingExpired,
} from "@/lib/match-expiry";

export const MAX_ACTIVE_MATCH_REQUESTS = 3;

export const ACTIVE_MATCH_STATUSES = [
  "pending",
  "approved",
  "contacted",
] as const;

export type ActiveMatchStatus = (typeof ACTIVE_MATCH_STATUSES)[number];

export function isActiveMatchStatus(status: string): status is ActiveMatchStatus {
  return ACTIVE_MATCH_STATUSES.includes(status as ActiveMatchStatus);
}

export function countsTowardActiveQuota(
  status: string,
  createdAt: string,
  now: number = Date.now()
) {
  const effectiveStatus = getEffectiveMatchStatus(status, createdAt, now);
  return isActiveMatchStatus(effectiveStatus);
}

export function blocksNewRequestToPair(
  status: string,
  createdAt: string,
  now: number = Date.now()
) {
  if (status === "rejected") {
    return true;
  }

  return countsTowardActiveQuota(status, createdAt, now);
}

export { isPendingExpired };