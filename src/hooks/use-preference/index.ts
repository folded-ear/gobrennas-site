import { useFragment } from "@apollo/client/react";
import { PreferenceValueFragmentDoc } from "./__generated__/preferenceValue.generated";

export function usePreference(name: string) {
  return useFragment({
    fragment: PreferenceValueFragmentDoc,
    from: {
      name,
      __typename: "UserPreference",
    },
  }).data.value;
}
