"use client";

import { motion } from "framer-motion";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  onMenuClick?: () => void;
  className?: string;
};

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  onMenuClick,
  className,
}: PageHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "mb-8 flex flex-col gap-4 border-b border-fk-gold/15 pb-6 sm:mb-10 sm:gap-5 sm:pb-8 md:flex-row md:items-end md:justify-between",
        className
      )}
    >
      <div className="flex items-start gap-4">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="mt-1 rounded-sm p-2 text-fk-plum hover:bg-fk-warm lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
        )}
        <div>
          {eyebrow && <p className="fk-eyebrow mb-3">{eyebrow}</p>}
          <h1 className="font-heading text-2xl font-medium tracking-wide text-fk-plum md:text-3xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-3">{actions}</div>
      )}
    </motion.header>
  );
}