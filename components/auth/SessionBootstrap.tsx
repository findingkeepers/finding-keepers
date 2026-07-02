"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser";
import {
  clearTabSessionMarker,
  hasTabSessionMarker,
  markTabSessionActive,
} from "@/lib/supabase/browser";

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
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (bootstrapped.current) {
      return;
    }
    bootstrapped.current = true;

    async function bootstrap() {
      if (isPublicPath(pathname)) {
        return;
      }

      try {
        const response = await fetch("/api/auth/session", {
          credentials: "include",
          cache: "no-store",
        });

        if (response.status === 401) {
          return;
        }

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          session: {
            access_token: string;
            refresh_token: string;
            expires_in?: number;
            expires_at?: number;
            token_type?: string;
          } | null;
          rememberMe: boolean;
        };

        if (!payload.session) {
          return;
        }

        if (!payload.rememberMe && !hasTabSessionMarker()) {
          await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "include",
          });
          clearTabSessionMarker();
          router.replace("/login");
          return;
        }

        const supabase = getBrowserSupabaseClient();
        await supabase.auth.setSession(payload.session);

        if (!payload.rememberMe) {
          markTabSessionActive();
        }
      } catch (error) {
        console.error("Session bootstrap error:", error);
      }
    }

    void bootstrap();
  }, [pathname, router]);

  return null;
}