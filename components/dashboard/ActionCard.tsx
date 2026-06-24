"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ActionCardProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  actionLabel: string;
  onAction: () => void;
  disabled?: boolean;
  disabledMessage?: string;
  buttonVariant?: "primary" | "destructive";
  index?: number;
  className?: string;
};

export function ActionCard({
  title,
  description,
  icon: Icon,
  actionLabel,
  onAction,
  disabled = false,
  disabledMessage,
  buttonVariant = "primary",
  index = 0,
  className,
}: ActionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="h-full"
    >
      <Card
        className={cn(
          "group grid h-full grid-rows-[1fr_auto] gap-0 transition-shadow duration-300 hover:shadow-md",
          className
        )}
      >
        <CardHeader className="flex flex-col pb-4">
          <div className="mb-2 flex size-10 items-center justify-center rounded-2xl bg-fk-gold/10 text-fk-gold transition-colors group-hover:bg-fk-gold/15">
            <Icon className="size-5" strokeWidth={1.5} />
          </div>
          <CardTitle className="text-xl text-fk-plum">{title}</CardTitle>
          <CardDescription className="min-h-[3rem] sm:min-h-[3.5rem]">
            {description}
          </CardDescription>
          {disabled && disabledMessage && (
            <p className="mt-2 text-sm leading-relaxed text-amber-700/90">
              {disabledMessage}
            </p>
          )}
        </CardHeader>

        <CardContent className="pb-6 pt-0">
          <Button
            onClick={onAction}
            disabled={disabled}
            variant={buttonVariant === "destructive" ? "destructive" : "premium"}
            className={cn(
              "h-11 w-full rounded-2xl",
              buttonVariant === "primary" &&
                "bg-fk-plum text-fk-cream hover:bg-fk-plum-deep"
            )}
          >
            {actionLabel}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}