"use client";

import { useState } from "react";
import { TERMS_CLOSING, TERMS_INTRO, TERMS_SECTIONS } from "@/lib/terms";
import { cn } from "@/lib/utils";

type TermsAgreementProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

export function TermsAgreement({ checked, onCheckedChange }: TermsAgreementProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3 rounded-xl border border-fk-gold/25 bg-fk-cream/30 p-4">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
          className="mt-1 size-4 rounded border-input accent-fk-plum"
          required
        />
        <span className="text-sm text-fk-body">
          I have read and agree to the{" "}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="font-medium text-fk-plum underline underline-offset-2 hover:text-fk-mauve"
          >
            Terms and Conditions of Participation
          </button>
        </span>
      </label>

      <div
        className={cn(
          "overflow-hidden transition-all duration-300",
          open ? "max-h-[420px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="max-h-96 overflow-y-auto rounded-lg border border-border bg-white/80 p-4 text-sm leading-relaxed text-fk-body">
          <h3 className="mb-3 font-heading text-base font-medium text-fk-plum">
            Terms and Conditions of Participation
          </h3>
          <p className="mb-4">{TERMS_INTRO}</p>
          {TERMS_SECTIONS.map((section) => (
            <div key={section.title} className="mb-4">
              <h4 className="mb-1 font-medium text-fk-plum">{section.title}</h4>
              <p>{section.body}</p>
            </div>
          ))}
          <p className="font-medium">{TERMS_CLOSING}</p>
        </div>
      </div>
    </div>
  );
}