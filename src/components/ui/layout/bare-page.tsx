import { Container } from "@/components/ui/layout/container";
import { EmptyHeader } from "@/components/views/header";
import { PropsWithChildren } from "react";

export default function BarePage({ children }: PropsWithChildren) {
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
