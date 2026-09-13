import { SectionNav } from "@/features/section-nav";
import { PropsWithChildren } from "react";

export default async function PrivateLayout({ children }: PropsWithChildren) {
  return (
    <>
      {/* clears the fixed section nav, however tall the device's inset */}
      <main className="min-h-dvh pb-[calc(3.5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <SectionNav />
    </>
  );
}
