import { PageStatus } from "@/features/page-status";
import { PropsWithChildren, ReactNode } from "react";

type SectionHeaderProps = PropsWithChildren<{
  title: string;
  leading?: ReactNode;
}>;

/**
 * I head a section's page, staying at the top of the screen as it scrolls.
 * Anything leading sits before my title, the page's sync status beside it,
 * and whatever controls the section offers at my far end.
 */
export function SectionHeader({
  title,
  leading,
  children,
}: SectionHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-sm border-b border-separator bg-background px-md pb-sm pt-[calc(var(--spacing-sm)+env(safe-area-inset-top))]">
      <div className="flex min-w-0 items-center gap-sm">
        {leading}
        <h1 className="truncate text-xl">{title}</h1>
        <PageStatus />
      </div>
      {children}
    </header>
  );
}
