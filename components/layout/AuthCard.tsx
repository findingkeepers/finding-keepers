"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { BrandTitle } from "@/components/ui/BrandTitle";

type AuthCardProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
  className,
}: AuthCardProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden fk-invitation-canvas px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className={cn(
          "relative z-10 w-full max-w-md fk-card-warm rounded-2xl p-6 sm:rounded-3xl sm:p-8 md:p-10",
          className
        )}
      >
        <div className="mb-8 text-center">
          <BrandTitle size="lg" />
          <div className="mx-auto my-5 w-20 fk-gold-line" />
          <p className="fk-eyebrow mb-3">{title}</p>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>

        {children}

        {footer && <div className="mt-8 text-center text-sm">{footer}</div>}
      </motion.div>
    </div>
  );
}