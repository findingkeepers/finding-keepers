"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { requireClientSession } from "@/lib/auth/require-client-session";
import { redirectToLogin } from "@/lib/auth/redirect-to-login";
import { DashboardContentSkeleton } from "@/components/dashboard/DashboardContentSkeleton";
import { DashboardLayoutProvider } from "@/components/dashboard/DashboardLayoutProvider";
import {
  isUserVerified,
  isVerifiedOnlyRoute,
} from "@/lib/verification";
import { toast } from "sonner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [authLoading, setAuthLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      const authed = await requireClientSession();
      if (!authed || cancelled) {
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        redirectToLogin();
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("verification_status")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      setIsVerified(isUserVerified(profile?.verification_status));
      setAuthLoading(false);
    };

    void checkAuth();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (authLoading) return;

    if (!isVerified && isVerifiedOnlyRoute(pathname)) {
      toast.error("Please complete verification to access this page.");
      router.replace("/dashboard");
    }
  }, [authLoading, isVerified, pathname, router]);

  if (!authLoading && !isVerified && isVerifiedOnlyRoute(pathname)) {
    return null;
  }

  return (
    <DashboardLayoutProvider isVerified={isVerified}>
      {authLoading ? <DashboardContentSkeleton /> : children}
    </DashboardLayoutProvider>
  );
}