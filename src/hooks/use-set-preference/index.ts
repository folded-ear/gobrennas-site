import { useMutation } from "@apollo/client/react";
import { toast } from "@heroui/react";
import { useCallback } from "react";
import { DoSetPreferenceDocument } from "./__generated__/doSetPreference.generated";

type SetOptions = {
  /** I keep a failed save from being reported to the user. */
  quiet?: boolean;
};

/**
 * I give a setter for the named preference. It shows the new value at once,
 * rolls it back if the save fails, and toasts the failure unless told to
 * keep quiet. The setter never rejects.
 */
export function useSetPreference(
  name: string,
): [(value: string, options?: SetOptions) => Promise<void>, typeof result] {
  const [mutate, result] = useMutation(DoSetPreferenceDocument, {
    variables: { name },
    optimisticResponse: ({ value, deviceKey }) => ({
      // a @client field, so never written; the mutation's type demands it
      deviceKey: deviceKey ?? "",
      profile: {
        __typename: "ProfileMutation" as const,
        setPreference: {
          __typename: "UserPreference" as const,
          name,
          value,
        },
      },
    }),
  });
  const setter = useCallback(
    async (value: string, { quiet = false }: SetOptions = {}) => {
      try {
        await mutate({ variables: { value } });
      } catch {
        if (quiet) return;
        toast.danger("Couldn’t save your change", {
          description: "Please try again.",
        });
      }
    },
    [mutate],
  );
  return [setter, result];
}
