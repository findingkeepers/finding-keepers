"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function hasAuthCallback(search: string, hash: string) {
  const searchParams = new URLSearchParams(search);

  if (
    searchParams.has("token_hash") ||
    searchParams.has("code") ||
    searchParams.get("type") === "signup" ||
    searchParams.get("type") === "email"
  ) {
    return true;
  }

  return (
    hash.includes("access_token") ||
    hash.includes("token_hash") ||
    hash.includes("type=signup") ||
    hash.includes("type=email")
  );
}

export function AuthCallbackRedirect() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/auth/confirm") return;

    const search = window.location.search;
    const hash = window.location.hash;

    if (!hasAuthCallback(search, hash)) return;

    const params = new URLSearchParams(search);
    if (!params.has("next")) {
      params.set("next", "/login");
    }

    const query = params.toString();
    window.location.replace(
      `/auth/confirm${query ? `?${query}` : ""}${hash}`
    );
  }, [pathname]);

  return null;
}