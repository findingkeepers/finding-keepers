"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { bootstrapClientSession } from "@/lib/auth/bootstrap-session";

const PUBLIC_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/auth/confirm",
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
  const router = useRouter();

  useEffect(() => {
    if (isPublicPath(pathname)) {
      return;
    }

    void bootstrapClientSession().then((result) => {
      if (result.tabExpired) {
        router.replace("/login");
      }
    });
  }, [pathname, router]);

  return null;
}