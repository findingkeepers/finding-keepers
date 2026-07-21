import { MATCH_STATUS, normalizeMatchStatus } from "@/lib/match-status";

export const PHOTO_VISIBILITY = {
  visible: "visible",
  blurred: "blurred",
} as const;

export type PhotoVisibility =
  (typeof PHOTO_VISIBILITY)[keyof typeof PHOTO_VISIBILITY];

/** Match statuses that unlock reciprocal unblurred photo access. */
export const PHOTO_UNLOCK_MATCH_STATUSES = [
  MATCH_STATUS.pending,
  MATCH_STATUS.interestReturned,
  MATCH_STATUS.active,
  MATCH_STATUS.contacted,
  "approved",
] as const;

export function normalizePhotoVisibility(
  value: string | null | undefined
): PhotoVisibility {
  return value === PHOTO_VISIBILITY.blurred
    ? PHOTO_VISIBILITY.blurred
    : PHOTO_VISIBILITY.visible;
}

export function matchStatusUnlocksPhoto(status: string) {
  const normalized = normalizeMatchStatus(status);
  return (PHOTO_UNLOCK_MATCH_STATUSES as readonly string[]).includes(
    normalized
  );
}

export function pairHasPhotoUnlock(
  requests: Array<{
    male_short_id: string;
    female_short_id: string;
    status: string;
  }>,
  shortIdA: string,
  shortIdB: string
) {
  return requests.some((request) => {
    if (!matchStatusUnlocksPhoto(request.status)) {
      return false;
    }

    const pair = new Set([request.male_short_id, request.female_short_id]);
    return pair.has(shortIdA) && pair.has(shortIdB);
  });
}

export function resolvePhotoAccess({
  photoVisibility,
  canSeeUnblurred,
  originalPath,
  blurPath,
}: {
  photoVisibility: string | null | undefined;
  canSeeUnblurred: boolean;
  originalPath: string | null | undefined;
  blurPath: string | null | undefined;
}): {
  storagePath: string | null;
  isBlurred: boolean;
} {
  const visibility = normalizePhotoVisibility(photoVisibility);
  const original = originalPath?.trim() || null;
  const blur = blurPath?.trim() || null;

  if (!original && !blur) {
    return { storagePath: null, isBlurred: false };
  }

  if (canSeeUnblurred || visibility === PHOTO_VISIBILITY.visible) {
    return {
      storagePath: original || blur,
      isBlurred: false,
    };
  }

  // Blurred preference and no unlock: prefer dedicated blur asset.
  if (blur) {
    return { storagePath: blur, isBlurred: true };
  }

  // Legacy photos without a blur asset — do not expose the original path.
  return { storagePath: null, isBlurred: true };
}
