"use client";

import { useState } from "react";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

type SafeProfileImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
  fallbackClassName?: string;
};

export function SafeProfileImage({
  src,
  alt,
  className,
  imgClassName,
  fallbackClassName,
}: SafeProfileImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-fk-bg-top",
          fallbackClassName || className
        )}
      >
        <User className="size-12 text-fk-mauve/40" strokeWidth={1} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={cn(imgClassName || className)}
      onError={() => setFailed(true)}
    />
  );
}
