import { Container } from "@/components/layout/container";

import { EmptyHeader } from "@/components/layout/header/empty-header";
import { PropsWithChildren } from "react";

export function BarePage({ children }: PropsWithChildren) {
  return (
    <>
      <EmptyHeader />
      <main>
        <Container>
          <div className="flex flex-col gap-lg bg-surface p-lg items-center rounded-md max-w-2/3 mx-auto">
            {children}
          </div>
        </Container>
      </main>
    </>
  );
}
