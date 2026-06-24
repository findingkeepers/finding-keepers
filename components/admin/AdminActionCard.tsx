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

type AdminActionCardProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  actionLabel: string;
  onAction: () => void;
  index?: number;
};

export function AdminActionCard({
  title,
  description,
  icon: Icon,
  actionLabel,
  onAction,
  index = 0,
}: AdminActionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={{ y: -2 }}
    >
      <Card
        className="h-full cursor-pointer transition-shadow duration-300 hover:shadow-md"
        onClick={onAction}
      >
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-fk-plum/5 text-fk-plum">
            <Icon className="size-5" strokeWidth={1.5} />
          </div>
          <CardTitle className="text-xl text-fk-plum">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="premium"
            className="h-11 w-full rounded-xl"
            onClick={(e) => {
              e.stopPropagation();
              onAction();
            }}
          >
            {actionLabel}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}