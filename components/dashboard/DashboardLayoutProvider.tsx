"use client";

import { createContext, useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { clearStoredAuthSessions } from "@/lib/supabase/browser";
import { DashboardSidebar } from "./DashboardSidebar";

type DashboardLayoutContextValue = {
  openMenu: () => void;
};

const DashboardLayoutContext =
  createContext<DashboardLayoutContextValue | null>(null);

export function useDashboardMenu() {
  const ctx = useContext(DashboardLayoutContext);
  return { onMenuClick: ctx?.openMenu ?? (() => {}) };
}

type DashboardLayoutProviderProps = {
  children: React.ReactNode;
  isVerified: boolean;
};

export function DashboardLayoutProvider({
  children,
  isVerified,
}: DashboardLayoutProviderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    clearStoredAuthSessions();
    router.push("/login");
  };

  return (
    <DashboardLayoutContext.Provider
      value={{ openMenu: () => setMobileOpen(true) }}
    >
      <div className="flex min-h-screen fk-paper-bg">
        <DashboardSidebar
          isVerified={isVerified}
          onLogout={handleLogout}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="px-4 py-6 sm:px-6 sm:py-8 md:px-10 md:py-10">{children}</div>
        </main>
      </div>
    </DashboardLayoutContext.Provider>
  );
}