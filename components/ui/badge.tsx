import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 font-heading text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-fk-plum text-fk-cream",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-fk-gold/50 text-fk-plum",
        success:
          "border-transparent bg-emerald-50 text-emerald-700 border border-emerald-200",
        warning:
          "border-transparent bg-amber-50 text-amber-800 border border-amber-200",
        muted: "border-transparent bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };