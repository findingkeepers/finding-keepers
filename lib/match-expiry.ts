export const PENDING_REPLY_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

export function getPendingExpiryDate(createdAt: string) {
  return new Date(new Date(createdAt).getTime() + PENDING_REPLY_DAYS * DAY_MS);
}

export function isPendingExpired(
  createdAt: string,
  now: number = Date.now()
) {
  return getPendingExpiryDate(createdAt).getTime() <= now;
}

export function getPendingExpiryCutoffIso(now: number = Date.now()) {
  return new Date(now - PENDING_REPLY_DAYS * DAY_MS).toISOString();
}

export function getEffectiveMatchStatus(
  status: string,
  createdAt: string,
  now: number = Date.now()
) {
  if (status === "pending" && isPendingExpired(createdAt, now)) {
    return "expired";
  }

  return status;
}

export function formatPendingExpiryHint(createdAt: string) {
  const expiry = getPendingExpiryDate(createdAt);
  return `Expires on ${expiry.toLocaleDateString()} if no response`;
}