"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  Heart,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/fk-admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/fk-admin/verification", label: "Verifications", icon: ShieldCheck },
  { href: "/fk-admin/matches", label: "Matches", icon: Heart },
  { href: "/fk-admin/cvs", label: "CVs", icon: FileText },
];

type AdminSidebarProps = {
  onLogout: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

export function AdminSidebar({
  onLogout,
  mobileOpen = false,
  onMobileClose,
}: AdminSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <>
      <div className="border-b border-white/10 px-6 py-8">
        <p className="fk-title text-3xl text-fk-gold-light">
          Finding Keepers
        </p>
        <p className="mt-1 text-xs uppercase tracking-[0.15em] text-fk-cream/60">
          Admin Panel
        </p>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-6">
        {navItems.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                active
                  ? "bg-fk-gold/20 text-fk-gold"
                  : "text-fk-cream/80 hover:bg-white/5 hover:text-fk-cream"
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-white/10 p-4">
        <Link
          href="/dashboard"
          onClick={onMobileClose}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-fk-cream/60 transition-colors hover:bg-white/5 hover:text-fk-cream"
        >
          User Dashboard
        </Link>
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-fk-cream/60 transition-colors hover:bg-white/5 hover:text-fk-cream"
        >
          <LogOut className="size-4" />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <>
      <aside className="hidden w-64 shrink-0 flex-col bg-fk-plum-deep lg:flex">
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onMobileClose}
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-fk-plum-deep shadow-xl">
            <button
              onClick={onMobileClose}
              className="absolute right-4 top-6 rounded-lg p-1 text-fk-cream/60 hover:bg-white/10"
              aria-label="Close menu"
            >
              <X className="size-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}