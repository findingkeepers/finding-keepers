"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

const steps = [
  { number: 1, title: "Enter HKID", description: "Provide your HKID number" },
  { number: 2, title: "Upload HKID", description: "Clear photo or scan" },
  { number: 3, title: "Payment Proof", description: "Upload payment confirmation" },
  { number: 4, title: "Admin Review", description: "Approval within 24–48 hours" },
];

export function VerificationStepper() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
      {steps.map((step, index) => (
        <motion.div
          key={step.number}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.08 }}
          className="relative rounded-2xl border border-border/60 bg-fk-bg-top p-4 sm:rounded-3xl sm:p-5"
        >
          <div className="mb-3 flex size-8 items-center justify-center rounded-full bg-fk-gold/15 text-sm font-semibold text-fk-plum">
            {step.number}
          </div>
          <h3 className="font-medium text-fk-plum">{step.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
          {index < steps.length - 1 && (
            <div className="absolute -right-2 top-1/2 hidden size-4 -translate-y-1/2 items-center justify-center rounded-full bg-fk-gold/20 lg:flex">
              <Check className="size-2.5 text-fk-gold" />
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}