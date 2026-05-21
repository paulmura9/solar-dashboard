import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function LiveSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <Skeleton className="h-6 w-48" />
      </div>

      <Card className="border border-[#e2e8f0] ring-0">
        <CardHeader>
          <Skeleton className="h-4 w-44" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[420px] w-full rounded-xl" />
        </CardContent>
      </Card>

      <Card className="border border-[#e2e8f0] ring-0">
        <CardHeader>
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-video w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
