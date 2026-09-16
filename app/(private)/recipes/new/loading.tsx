import { SectionHeader } from "@/components/section-header";
import { Skeleton } from "@heroui/react";

export default function RecipeCreateLoading() {
  return (
    <>
      <SectionHeader title="Add Recipe" />
      <div
        aria-label="Loading recipe form"
        className="w-full max-w-xl space-y-lg p-md"
        role="status"
      >
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-32 w-full" />
        <div className="flex gap-sm">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-20" />
        </div>
      </div>
    </>
  );
}
