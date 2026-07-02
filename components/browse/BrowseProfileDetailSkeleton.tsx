import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function SectionSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <Card className="gap-4">
      <div className="px-6 pt-6">
        <Skeleton className="h-4 w-48" />
      </div>
      <CardContent className="space-y-3">
        {Array.from({ length: lines }).map((_, index) => (
          <div key={index} className="space-y-1.5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-4 w-full" />
            {index === 0 ? <Skeleton className="h-4 w-[90%]" /> : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function BrowseProfileDetailSkeleton() {
  return (
    <>
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="overflow-hidden py-0 lg:col-span-1">
          <CardContent className="p-6">
            <Skeleton className="mb-4 aspect-square w-full rounded-xl" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="py-8">
            <div className="mb-6 flex flex-col items-center gap-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-10 w-40" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <SectionSkeleton lines={4} />
        <SectionSkeleton lines={3} />
        <SectionSkeleton lines={4} />
        <SectionSkeleton lines={3} />
        <SectionSkeleton lines={3} />
        <SectionSkeleton lines={2} />
      </div>
    </>
  );
}