import { cn } from "@/lib/utils";
import { getStatusLabel, normalizeMatchStatus } from "@/lib/match-status";

const statusStyles: Record<string, string> = {
  pending: "bg-amber-50 text-amber-800 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  interest_returned: "bg-emerald-50 text-emerald-700 border-emerald-200",
  active: "bg-violet-50 text-violet-700 border-violet-200",
  withdrawn: "bg-slate-50 text-slate-600 border-slate-200",
  unmatched: "bg-slate-50 text-slate-600 border-slate-200",
  verified: "bg-emerald-50 text-emerald-700 border-emerald-200",
  invalidated: "bg-red-50 text-red-700 border-red-200",
  contacted: "bg-sky-50 text-sky-700 border-sky-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  expired: "bg-slate-50 text-slate-600 border-slate-200",
};

type StatusBadgeProps = {
  status: string;
  className?: string;
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalized = normalizeMatchStatus(status.toLowerCase());
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-3 py-1 text-xs font-medium capitalize",
        statusStyles[normalized] ?? "bg-muted text-muted-foreground border-border",
        className
      )}
    >
      {getStatusLabel(normalized)}
    </span>
  );
}