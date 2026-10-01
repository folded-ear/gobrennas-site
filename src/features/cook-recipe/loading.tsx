import { Skeleton } from "@heroui/react";

export function CookLoading() {
  return (
    <div
      role="status"
      aria-label="Loading planned recipe"
      className="mx-auto w-full max-w-5xl space-y-lg p-md"
    >
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-10 w-36" />
      <div className="grid gap-lg md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
