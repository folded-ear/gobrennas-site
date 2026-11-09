import { Container } from "@/components/container";
import { buttonVariants } from "@heroui/react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <Container>
      <main>
        <h1>Page not found</h1>
        <p className="my-md">
          This link doesn’t lead anywhere. It may be mistyped, or what it
          pointed to may be gone.
        </p>
        <Link href="/" className={buttonVariants()}>
          Go home
        </Link>
      </main>
    </Container>
  );
}
