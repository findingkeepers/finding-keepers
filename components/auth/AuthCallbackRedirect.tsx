"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function hasAuthCallback(search: string, hash: string) {
  const searchParams = new URLSearchParams(search);

  if (
    searchParams.has("token_hash") ||
    searchParams.has("code") ||
    searchParams.get("type") === "signup" ||
    searchParams.get("type") === "email" ||
    searchParams.get("type") === "recovery"
  ) {
    return true;
  }

  return (
    hash.includes("access_token") ||
    hash.includes("token_hash") ||
    hash.includes("type=signup") ||
    hash.includes("type=email") ||
    hash.includes("type=recovery")
  );
}

function getAuthRedirectTarget(search: string, hash: string) {
  const searchParams = new URLSearchParams(search);
  const isRecovery =
    searchParams.get("type") === "recovery" || hash.includes("type=recovery");

  if (isRecovery) {
    return `/reset-password${search}${hash}`;
  }

  const params = new URLSearchParams(search);
  if (!params.has("next")) {
    params.set("next", "/login");
  }

  const query = params.toString();
  return `/auth/confirm${query ? `?${query}` : ""}${hash}`;
}

export function AuthCallbackRedirect() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/auth/confirm" || pathname === "/reset-password") return;

    const search = window.location.search;
    const hash = window.location.hash;

    if (!hasAuthCallback(search, hash)) return;

    window.location.replace(getAuthRedirectTarget(search, hash));
  }, [pathname]);

  return null;
}