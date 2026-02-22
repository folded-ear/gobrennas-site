import { query } from "@/lib/apollo-rsc";
import { CombinedGraphQLErrors, gql, TypedDocumentNode } from "@apollo/client";
import { cache } from "react";
import { GetRolesRscQuery } from "./__generated__/is-authenticated.generated";

const GET_ROLES_RSC: TypedDocumentNode<GetRolesRscQuery> = gql(`
query getRolesRsc {
  profile {
    me {
      id
      roles
    }
  }
}`);

export const getRoles = cache(async () => {
  return await query({ query: GET_ROLES_RSC }).then(
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
