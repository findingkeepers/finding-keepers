"use client";

import * as React from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

type FilePickerProps = Omit<
  React.ComponentProps<"input">,
  "type" | "className" | "onChange"
> & {
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  buttonLabel?: string;
  emptyLabel?: string;
};

export function FilePicker({
  id,
  onChange,
  className,
  buttonLabel = "Choose file",
  emptyLabel = "No file chosen",
  disabled,
  ...props
}: FilePickerProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = React.useState("");
  const generatedId = React.useId();
  const inputId = id ?? generatedId;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setFileName(file?.name ?? "");
    onChange?.(event);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className={cn(
          "flex flex-col gap-3 rounded-xl border border-dashed border-fk-gold/35 bg-fk-cream/30 p-4 transition-all sm:flex-row sm:items-center sm:justify-between",
          disabled
            ? "cursor-not-allowed opacity-60"
            : "cursor-pointer hover:border-fk-gold/55 hover:bg-fk-cream/50 hover:shadow-sm"
        )}
        onClick={() => {
          if (!disabled) inputRef.current?.click();
        }}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-controls={inputId}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-fk-plum">
            {fileName || emptyLabel}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Click to browse or select a file
          </p>
        </div>

        <span
          className={cn(
            "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-fk-plum px-5 text-sm font-semibold text-fk-cream transition-colors",
            disabled
              ? "cursor-not-allowed"
              : "cursor-pointer hover:bg-fk-plum-deep"
          )}
        >
          <Upload className="size-4" />
          {buttonLabel}
        </span>
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        disabled={disabled}
        className="sr-only"
        onChange={handleChange}
        {...props}
      />
    </div>
  );
}
