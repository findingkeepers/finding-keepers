"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  Heart,
  Home,
  LogOut,
  PenLine,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresVerification?: boolean;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/cv-builder", label: "CV Builder", icon: PenLine, requiresVerification: true },
  { href: "/dashboard/my-cv", label: "My CV", icon: FileText, requiresVerification: true },
  { href: "/browse", label: "Browse", icon: Search, requiresVerification: true },
  {
    href: "/dashboard/my-match-requests",
    label: "Match Requests",
    icon: Heart,
    requiresVerification: true,
  },
];

type DashboardSidebarProps = {
  isVerified: boolean;
  onLogout: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

export function DashboardSidebar({
  isVerified,
  onLogout,
  mobileOpen = false,
  onMobileClose,
}: DashboardSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <>
      <div className="border-b border-border/60 px-6 py-8">
        <Link
          href="/"
          className="fk-title text-3xl text-fk-plum-light"
          onClick={onMobileClose}
        >
          Finding Keepers
        </Link>
        <p className="mt-1 text-xs uppercase tracking-[0.15em] text-muted-foreground">
          Your Dashboard
        </p>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-6">
        {navItems.map((item) => {
          const disabled = item.requiresVerification && !isVerified;
          const active = isActive(item.href);

          if (disabled) {
            return (
              <div
                key={item.href}
                className="flex cursor-not-allowed items-center gap-3 rounded-xl px-4 py-3 text-sm text-muted-foreground/50"
              >
                <item.icon className="size-4" />
                {item.label}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors duration-200",
                active
                  ? "bg-fk-plum text-fk-cream shadow-sm"
                  : "text-fk-body hover:bg-accent hover:text-fk-plum"
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border/60 p-4">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-fk-plum"
        >
          <LogOut className="size-4" />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-fk-gold/15 bg-[#faf6f1] lg:flex">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-fk-plum/20 backdrop-blur-sm"
            onClick={onMobileClose}
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-fk-bg-top shadow-xl">
            <button
              onClick={onMobileClose}
              className="absolute right-4 top-6 rounded-lg p-1 text-muted-foreground hover:bg-accent"
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