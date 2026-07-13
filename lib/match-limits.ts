import {
  blocksNewRequestToPair,
  countsTowardInterestQuota,
  INTEREST_QUOTA_STATUSES,
  MATCH_STATUS,
} from "@/lib/match-status";

export const MAX_ACTIVE_MATCH_REQUESTS = 3;

/** DB statuses queried when counting outbound interest quota (includes legacy approved). */
export const INTEREST_QUOTA_DB_STATUSES = [
  MATCH_STATUS.pending,
  MATCH_STATUS.interestReturned,
  "approved",
] as const;

export const ACTIVE_MATCH_STATUSES = INTEREST_QUOTA_DB_STATUSES;

export {
  blocksNewRequestToPair,
  countsTowardInterestQuota as countsTowardActiveQuota,
  INTEREST_QUOTA_STATUSES,
};

export { isPendingExpired } from "@/lib/match-expiry";