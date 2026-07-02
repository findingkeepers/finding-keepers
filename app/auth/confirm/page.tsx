"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { confirmEmailAuthCode } from "@/app/actions/auth";
import { supabase } from "@/lib/supabase";
import { LoadingSpinner } from "@/components/layout/LoadingSpinner";

function ConfirmEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    async function confirmEmail() {
      const next = searchParams.get("next") || "/login";
      const code = searchParams.get("code");
      let token_hash = searchParams.get("token_hash");
      let type = searchParams.get("type") as EmailOtpType | null;

      if (window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.slice(1));
        token_hash = token_hash || hashParams.get("token_hash");
        type = type || (hashParams.get("type") as EmailOtpType | null);

        if (hashParams.get("access_token") && !token_hash && !code) {
          await supabase.auth.signOut();
          router.replace(`${next}?verified=1`);
          return;
        }
      }

      if (code) {
        const result = await confirmEmailAuthCode(code);
        if (result.ok) {
          await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "include",
          });
          router.replace(`${next}?verified=1`);
          return;
        }
      }

      if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({ token_hash, type });
        if (!error) {
          await supabase.auth.signOut();
          router.replace(`${next}?verified=1`);
          return;
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        await supabase.auth.signOut();
        router.replace(`${next}?verified=1`);
        return;
      }

      router.replace("/login?error=confirmation_failed");
    }

    void confirmEmail();
  }, [router, searchParams]);

  return <LoadingSpinner fullScreen message="Confirming your email..." />;
}

export default function ConfirmEmailPage() {
  return (
    <Suspense
      fallback={
        <LoadingSpinner fullScreen message="Confirming your email..." />
      }
    >
      <ConfirmEmailContent />
    </Suspense>
  );
}