import { query } from "@/lib/apollo-rsc";
import { CombinedGraphQLErrors } from "@apollo/client";
import { cache } from "react";
import { GetUserProfileRscDocument } from "./__generated__/getUserProfileRsc.generated";

export const getUserProfile = cache(async () => {
  return await query({
    query: GetUserProfileRscDocument,
  }).then(
    ({ data }) => {
      return data;
    },
    (error) => {
      if (CombinedGraphQLErrors.is(error)) {
        for (let e of error.errors) {
          if (e.extensions?.classification === "UNAUTHORIZED") {
            return undefined;
          }
        }
      }
      throw error;
    },
  );
});
