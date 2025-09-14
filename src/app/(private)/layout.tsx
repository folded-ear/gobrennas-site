"use client";

import { Header } from "@/components/views/header";
import { PropsWithChildren } from "react";

export default function PrivateLayout({ children }: PropsWithChildren) {
  return (
    <div className="h-dvh">
      <Header />
      <main>{children}</main>
    </div>
  );
}
