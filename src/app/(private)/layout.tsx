"use server";

import { Header } from "@/components/views/header";
import { PropsWithChildren } from "react";

export default async function PrivateLayout({ children }: PropsWithChildren) {
  return (
    <div className="h-dvh">
      <Header />
      <main>{children}</main>
    </div>
  );
}
