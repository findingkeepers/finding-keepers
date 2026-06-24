import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type FilterBarProps = {
  children: React.ReactNode;
  className?: string;
  columns?: number;
};

export function FilterBar({
  children,
  className,
  columns = 4,
}: FilterBarProps) {
  const gridClass =
    columns === 3
      ? "md:grid-cols-3"
      : columns === 4
        ? "md:grid-cols-4"
        : "md:grid-cols-2";

  return (
    <Card className={cn("mb-8 py-4", className)}>
      <CardContent>
        <div className={cn("grid grid-cols-1 gap-4", gridClass)}>
          {children}
        </div>
      </CardContent>
    </Card>
  );
}