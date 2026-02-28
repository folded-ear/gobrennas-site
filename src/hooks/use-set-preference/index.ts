import { useMutation } from "@apollo/client/react";
import { useCallback } from "react";
import { DoSetPreferenceDocument } from "./__generated__/doSetPreference.generated";

export function useSetPreference(
  name: string,
): [(value: string) => ReturnType<typeof mutate>, typeof result] {
  const [mutate, result] = useMutation(DoSetPreferenceDocument, {
    variables: { name },
  });
  const setter = useCallback(
    (value: string) => mutate({ variables: { value } }),
    [mutate],
  );
  return [setter, result];
}
