// This import is necessary to ensure all Apollo Client imports
// are still available to the rest of the application.
import "@apollo/client";
import type { GraphQLCodegenDataMasking } from "@apollo/client/masking";

declare module "@apollo/client" {
  interface TypeOverrides extends GraphQLCodegenDataMasking.TypeOverrides {}

  interface DefaultContext {
    /**
     * I say whether a failed mutation gets the generic failure toast. False
     * means its caller reports the failure itself.
     */
    failureToast?: false;
  }
}
