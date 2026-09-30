import { SectionHeader } from "@/components/section-header";
import { Skeleton } from "@heroui/react";

export function RecipeEditLoading() {
  return (
    <>
      <SectionHeader title="Edit Recipe" />
      <div
        role="status"
        aria-label="Loading recipe editor"
        className="w-full max-w-5xl space-y-md p-md"
      >
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-md sm:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </>
  );
}
