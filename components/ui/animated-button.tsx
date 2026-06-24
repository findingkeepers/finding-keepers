"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type AnimatedButtonProps = {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "outline";
  className?: string;
};

const variantStyles = {
  primary: [
    "bg-fk-plum text-fk-cream",
    "border border-fk-plum",
    "hover:bg-fk-plum-deep hover:border-fk-plum-deep",
    "shadow-[0_2px_12px_rgba(74,37,69,0.2)]",
  ].join(" "),
  outline: [
    "bg-transparent text-fk-plum",
    "border border-fk-gold",
    "hover:bg-fk-gold/10 hover:border-fk-gold",
  ].join(" "),
};

export function AnimatedButton({
  href,
  children,
  variant = "primary",
  className,
}: AnimatedButtonProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <Link
        href={href}
        className={cn(
          "inline-flex min-w-[160px] items-center justify-center px-10 py-3.5",
          "font-heading text-[0.72rem] font-medium uppercase tracking-[0.22em]",
          "transition-all duration-300",
          variantStyles[variant],
          className
        )}
      >
        {children}
      </Link>
    </motion.div>
  );
}