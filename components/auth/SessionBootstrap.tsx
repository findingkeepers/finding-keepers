"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { bootstrapClientSession } from "@/lib/auth/bootstrap-session";
import { redirectToLogin } from "@/lib/auth/redirect-to-login";

const PUBLIC_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/auth/confirm",
  "/auth/recovery",
  "/fk-admin/login",
  "/",
];

function isPublicPath(pathname: string) {
  if (pathname === "/") {
    return true;
  }

  return PUBLIC_PREFIXES.some(
    (prefix) => prefix !== "/" && pathname.startsWith(prefix)
  );
}

export function SessionBootstrap() {
  const pathname = usePathname();

  useEffect(() => {
    if (isPublicPath(pathname)) {
      return;
    }

    void bootstrapClientSession().then((result) => {
      if (!result.authenticated) {
        redirectToLogin(
          pathname.startsWith("/fk-admin") ? "/fk-admin/login" : "/login"
        );
      }
    });
  }, [pathname]);

  return null;
}