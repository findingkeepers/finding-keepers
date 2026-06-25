"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrowseNav() {
  const pathname = usePathname();
  const isBrowse = pathname.startsWith("/browse");

  return (
    <header className="sticky top-0 z-40 border-b border-fk-gold/15 bg-[#faf6f1]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link
          href="/dashboard"
          className="fk-title text-2xl text-fk-plum-light"
        >
          Finding Keepers
        </Link>

        <nav className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-fk-body transition-colors hover:bg-accent"
          >
            <LayoutDashboard className="size-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <Link
            href="/browse"
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors",
              isBrowse
                ? "bg-fk-plum text-fk-cream"
                : "text-fk-body hover:bg-accent"
            )}
          >
            <Search className="size-4" />
            <span className="hidden sm:inline">Browse</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}