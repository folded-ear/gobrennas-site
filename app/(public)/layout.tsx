import { Container } from "@/components/container";
import { PropsWithChildren } from "react";

export default async function PublicLayout({ children }: PropsWithChildren) {
  return (
    <Container>
      <main>{children}</main>
    </Container>
  );
}
