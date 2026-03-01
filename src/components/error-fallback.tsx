"use client";

import { Login } from "@/components/login";
import { CombinedGraphQLErrors } from "@apollo/client";
import { Button } from "@heroui/react";
import { type FallbackProps, getErrorMessage } from "react-error-boundary";

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  if (CombinedGraphQLErrors.is(error)) {
    for (let e of error.errors) {
      if (e.extensions?.classification === "UNAUTHORIZED") {
        return <Login />;
      }
    }
  }
  return (
    <div className="flex flex-col gap-lg bg-surface p-xl items-center rounded-md max-w-1/2 mx-auto my-4">
      <p>Something went wrong:</p>
      <pre className="text-danger text-wrap">
        {getErrorMessage(error) ?? "Unknown error"}
      </pre>
      <Button variant={"tertiary"} onClick={resetErrorBoundary}>
        Try again?
      </Button>
    </div>
  );
}
