import { useMutation } from "@apollo/client/react";
import { useCallback } from "react";
import { DoSetPreferenceDocument } from "./__generated__/doSetPreference.generated";

export function useSetPreference(
  name: string,
): [(value: string) => ReturnType<typeof mutate>, typeof result] {
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
    (value: string) => mutate({ variables: { value } }),
    [mutate],
  );
  return [setter, result];
}
