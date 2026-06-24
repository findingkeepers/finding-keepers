import { cn } from "@/lib/utils";

type LoadingSpinnerProps = {
  message?: string;
  className?: string;
  fullScreen?: boolean;
};

export function LoadingSpinner({
  message = "Loading...",
  className,
  fullScreen = false,
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        fullScreen ? "min-h-[50vh]" : "py-20",
        className
      )}
    >
      <div className="size-8 animate-spin rounded-full border-2 border-fk-gold border-t-transparent" />
      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  );
}