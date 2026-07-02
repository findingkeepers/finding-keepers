"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { bootstrapClientSession } from "@/lib/auth/bootstrap-session";
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
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      const session = await bootstrapClientSession();

      if (!session.authenticated) {
        router.push("/login");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("verification_status")
        .eq("id", user.id)
        .maybeSingle();

      setIsVerified(isUserVerified(profile?.verification_status));
      setLoading(false);
    };

    checkAuth();
  }, [router, pathname]);

  useEffect(() => {
    if (loading) return;

    if (!isVerified && isVerifiedOnlyRoute(pathname)) {
      toast.error("Please complete verification to access this page.");
      router.replace("/dashboard");
    }
  }, [loading, isVerified, pathname, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-fk-bg-top">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-fk-gold border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isVerified && isVerifiedOnlyRoute(pathname)) {
    return null;
  }

  return (
    <DashboardLayoutProvider isVerified={isVerified}>
      {children}
    </DashboardLayoutProvider>
  );
}