"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { bootstrapClientSession, resetSessionBootstrap } from "@/lib/auth/bootstrap-session";
import { LoadingSpinner } from "@/components/layout/LoadingSpinner";
import { AdminSidebar } from "./AdminSidebar";

type AdminLayoutContextValue = {
  openMenu: () => void;
};

const AdminLayoutContext = createContext<AdminLayoutContextValue | null>(null);

export function useAdminMenu() {
  const ctx = useContext(AdminLayoutContext);
  return { onMenuClick: ctx?.openMenu ?? (() => {}) };
}

export function AdminLayoutProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAdmin = async () => {
      const session = await bootstrapClientSession();

      if (!session.authenticated) {
        router.push("/fk-admin/login");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/fk-admin/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile || profile.role !== "admin") {
        router.push("/dashboard");
        return;
      }

      setAuthorized(true);
      setLoading(false);
    };

    checkAdmin();
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    await supabase.auth.signOut();
    resetSessionBootstrap();
    router.push("/fk-admin/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-fk-bg-top">
        <LoadingSpinner message="Loading admin panel..." />
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <AdminLayoutContext.Provider value={{ openMenu: () => setMobileOpen(true) }}>
      <div className="flex min-h-screen bg-fk-bg-top">
        <AdminSidebar
          onLogout={handleLogout}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="px-6 py-8 md:px-10 md:py-10">
            <button
              onClick={() => setMobileOpen(true)}
              className="mb-4 rounded-lg p-2 text-fk-plum hover:bg-accent lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </button>
            {children}
          </div>
        </main>
      </div>
    </AdminLayoutContext.Provider>
  );
}