import { PageStatus } from "@/features/page-status";
import { PropsWithChildren } from "react";

type SectionHeaderProps = PropsWithChildren<{
  title: string;
}>;

/**
 * I head a section's page, staying at the top of the screen as it scrolls.
 * The page's sync status sits beside my title, and whatever controls the
 * section offers sit alongside.
 */
export function SectionHeader({ title, children }: SectionHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-sm border-b border-separator bg-background px-md pb-sm pt-[calc(var(--spacing-sm)+env(safe-area-inset-top))]">
      <div className="flex min-w-0 items-center gap-sm">
        <h1 className="truncate text-xl">{title}</h1>
        <PageStatus />
      </div>
      {children}
    </header>
  );
}
