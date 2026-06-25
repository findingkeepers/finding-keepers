"use client";

import { Menu } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type DashboardHeaderProps = {
  userName?: string;
  isVerified: boolean;
  subtitle?: string;
  onMenuClick?: () => void;
};

export function DashboardHeader({
  userName,
  isVerified,
  subtitle,
  onMenuClick,
}: DashboardHeaderProps) {
  const greeting = userName ? `Welcome, ${userName}` : "Welcome";

  return (
    <header className="mb-8 flex items-start justify-between gap-4">
      <div className="flex items-start gap-4">
        <button
          onClick={onMenuClick}
          className="mt-1 rounded-lg p-2 text-fk-plum hover:bg-accent lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </button>
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-2xl font-medium tracking-wide text-fk-plum md:text-3xl">
              {greeting}
            </h1>
            <Badge variant={isVerified ? "success" : "warning"}>
              {isVerified ? "Verified" : "Pending Verification"}
            </Badge>
          </div>
          {subtitle && (
            <p className="mt-2 text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
    </header>
  );
}