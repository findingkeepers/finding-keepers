import { getSafeRedirectPath } from "@/lib/auth/safe-redirect";

export function redirectToLogin(loginPath = "/login") {
  if (typeof window === "undefined") {
    return;
  }

  const next = getSafeRedirectPath(
    `${window.location.pathname}${window.location.search}`,
    "/dashboard"
  );

  const url = new URL(loginPath, window.location.origin);
  if (loginPath === "/login") {
    url.searchParams.set("next", next);
  }

  window.location.replace(`${url.pathname}${url.search}`);
}