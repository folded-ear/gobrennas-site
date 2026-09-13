import { Container } from "@/components/container";
import { Sidebar } from "@/features/sidebar";
import { PropsWithChildren } from "react";

export default async function PrivateLayout({ children }: PropsWithChildren) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Container>{children}</Container>
      </main>
    </div>
  );
}
