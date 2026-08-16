import { Container } from "@/components/container";
import { Drawer } from "@/components/drawer";
import { Sidebar } from "@/components/sidebar/sidebar";
import { PropsWithChildren } from "react";

export default async function PrivateLayout({ children }: PropsWithChildren) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1">
        <Container>{children}</Container>
      </main>
      <Drawer />
    </div>
  );
}
