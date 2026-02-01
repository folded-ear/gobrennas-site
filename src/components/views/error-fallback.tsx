"use client";

import { doLogin } from "@/app/(public)/constants";
import BarePage from "@/components/ui/layout/bare-page";
import { CombinedGraphQLErrors } from "@apollo/client";
import { Button } from "@heroui/react";
import { type FallbackProps, getErrorMessage } from "react-error-boundary";

export default function ErrorFallback({
  error,
  resetErrorBoundary,
}: FallbackProps) {
  if (CombinedGraphQLErrors.is(error)) {
    for (let e of error.errors) {
      if (e.extensions?.classification === "UNAUTHORIZED") {
        return (
          <BarePage>
            <p>Your session has expired. You need to log in again.</p>
            <Button onPress={doLogin}>Login with Google</Button>
          </BarePage>
        );
      }
    }
  }
  return (
    <BarePage>
      <p>Something went wrong:</p>
      <pre className="text-danger text-wrap">
        {getErrorMessage(error) ?? "Unknown error"}
      </pre>
      <Button variant={"tertiary"} onClick={resetErrorBoundary}>
        Try again?
      </Button>
    </BarePage>
  );
}
