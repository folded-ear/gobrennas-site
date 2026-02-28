"use client";

import { Container } from "@/components/layout";
import { PropsWithChildren } from "react";

export default function RecipesLayout({ children }: PropsWithChildren) {
  return (
    <div className="flex">
      <Container>{children}</Container>
    </div>
  );
}
