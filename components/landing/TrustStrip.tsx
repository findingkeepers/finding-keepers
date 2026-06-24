"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Lock, Users } from "lucide-react";

const items = [
  { icon: ShieldCheck, label: "Verified Profiles" },
  { icon: Lock, label: "Privacy First" },
  { icon: Users, label: "Admin-Guided Matching" },
];

export function TrustStrip() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.9 }}
      className="mt-20 flex w-full max-w-2xl flex-col items-center justify-center gap-5 border-t border-fk-gold/20 pt-10 sm:flex-row sm:gap-0"
    >
      {items.map((item, index) => (
        <div
          key={item.label}
          className="flex flex-1 flex-col items-center gap-2 px-4 text-center"
        >
          <item.icon
            className="size-4 text-fk-gold"
            strokeWidth={1.25}
          />
          <span className="font-heading text-[0.65rem] font-normal uppercase tracking-[0.2em] text-fk-mauve">
            {item.label}
          </span>
          {index < items.length - 1 && (
            <span className="absolute hidden sm:block" />
          )}
        </div>
      ))}
    </motion.div>
  );
}