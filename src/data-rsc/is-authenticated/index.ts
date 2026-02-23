import { query } from "@/lib/apollo-rsc";
import { CombinedGraphQLErrors } from "@apollo/client";
import { cache } from "react";
import { GetRolesRscDocument } from "./__generated__/getRolesRsc.generated";

export const getRoles = cache(async () => {
  return await query({ query: GetRolesRscDocument }).then(
    ({ data }) => {
      return data?.profile.me.roles ?? [];
    },
    (error) => {
      if (CombinedGraphQLErrors.is(error)) {
        console.log("got the unauth!");
        for (let e of error.errors) {
          if (e.extensions?.classification === "UNAUTHORIZED") {
            return [] as string[];
          }
        }
      }
      throw error;
    },
  );
});

export const isAuthenticated = async () => {
  return hasRole("USER");
};

export const isDeveloper = async () => {
  return hasRole("DEVELOPER");
};

export const hasRole = async (role: string) => {
  return (await getRoles()).includes(role);
};
