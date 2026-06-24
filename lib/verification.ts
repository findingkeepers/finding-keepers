export const VERIFIED_ONLY_DASHBOARD_ROUTES = [
  "/dashboard/cv-builder",
  "/dashboard/my-cv",
  "/dashboard/my-match-requests",
] as const;

/** Maps admin verification_request status → profiles.verification_status */
export function profileStatusFromRequestStatus(
  requestStatus: string
): "verified" | "unverified" {
  return requestStatus === "verified" ? "verified" : "unverified";
}

export function isVerifiedOnlyRoute(pathname: string): boolean {
  return VERIFIED_ONLY_DASHBOARD_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export function isUserVerified(
  verificationStatus: string | null | undefined
): boolean {
  return verificationStatus === "verified";
}