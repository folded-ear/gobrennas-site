import { query } from "@/lib/apollo-rsc";
import { gql, TypedDocumentNode } from "@apollo/client";
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
  const { data } = await query({ query: GET_ROLES_RSC });
  return data?.profile.me.roles ?? [];
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
