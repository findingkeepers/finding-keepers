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