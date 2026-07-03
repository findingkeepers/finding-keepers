"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { sanitizePhoneInput } from "@/lib/phone";

function PhoneInput({
  onChange,
  ...props
}: React.ComponentProps<typeof Input>) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizePhoneInput(event.target.value);
    event.target.value = sanitized;
    onChange?.(event);
  };

  return (
    <Input
      {...props}
      type="tel"
      inputMode="tel"
      autoComplete={props.autoComplete ?? "tel"}
      onChange={handleChange}
    />
  );
}

export { PhoneInput };