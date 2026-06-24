"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AdminStatCardProps = {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  accent?: "gold" | "plum" | "amber" | "sky";
  index?: number;
  onClick?: () => void;
};

const accentStyles = {
  gold: "text-fk-gold",
  plum: "text-fk-plum",
  amber: "text-amber-600",
  sky: "text-sky-600",
};

export function AdminStatCard({
  label,
  value,
  icon: Icon,
  accent = "plum",
  index = 0,
  onClick,
}: AdminStatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08 }}
    >
      <Card
        className={cn(
          "py-5 transition-shadow hover:shadow-md",
          onClick && "cursor-pointer"
        )}
        onClick={onClick}
      >
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p
              className={cn(
                "mt-1 font-title text-4xl font-medium",
                accentStyles[accent]
              )}
            >
              {value}
            </p>
          </div>
          {Icon && (
            <div className="flex size-12 items-center justify-center rounded-xl bg-fk-gold/10">
              <Icon className={cn("size-5", accentStyles[accent])} />
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}