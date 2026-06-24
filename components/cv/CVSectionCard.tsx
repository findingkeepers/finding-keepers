"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type CVSectionCardProps = {
  title: string;
  children: React.ReactNode;
  index?: number;
  className?: string;
};

export function CVSectionCard({
  title,
  children,
  index = 0,
  className,
}: CVSectionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
    >
      <Card className={cn("gap-4", className)}>
        <CardHeader className="pb-0">
          <CardTitle className="text-base font-medium uppercase tracking-[0.12em] text-fk-plum">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed">
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function CVField({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div>
      <span className="font-medium text-fk-plum/70">{label}: </span>
      <span className="text-fk-body">{value || "N/A"}</span>
    </div>
  );
}