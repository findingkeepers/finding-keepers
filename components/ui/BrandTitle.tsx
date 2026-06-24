import Link from "next/link";
import { cn } from "@/lib/utils";

type BrandTitleProps = {
  href?: string;
  size?: "sm" | "md" | "lg" | "hero";
  className?: string;
};

const sizes = {
  sm: "text-2xl",
  md: "text-3xl md:text-4xl",
  lg: "text-4xl md:text-5xl",
  hero: "text-[clamp(2rem,6vw,3.5rem)]",
};

export function BrandTitle({ href = "/", size = "md", className }: BrandTitleProps) {
  const classes = cn("fk-title leading-none text-fk-plum", sizes[size], className);

  if (href) {
    return (
      <Link href={href} className={cn(classes, "transition-opacity hover:opacity-85")}>
        Finding Keepers
      </Link>
    );
  }

  return <span className={classes}>Finding Keepers</span>;
}