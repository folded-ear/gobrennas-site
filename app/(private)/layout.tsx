import { SectionNav } from "@/features/section-nav";
import { ReactNode } from "react";

type PrivateLayoutProps = {
  children: ReactNode;
  /** Whatever slides in over the page, if anything. */
  screen: ReactNode;
};

export default async function PrivateLayout({
  children,
  screen,
}: PrivateLayoutProps) {
  return (
    <>
      {/* clears the fixed section nav, however tall the device's inset */}
      <main className="min-h-dvh pb-[calc(3.5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <SectionNav />
      {screen}
    </>
  );
}
