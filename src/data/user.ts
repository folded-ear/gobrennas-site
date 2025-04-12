"use server";

import { fetchGraphQL } from "@/lib/network";
import { graphql } from "@/__graphql";

export async function fetchUser() {
  return fetchGraphQL(
    graphql(`query me {
      getCurrentUser {
        id
        name
        email
        imageUrl
        provider
        roles
      }
    }
  `),
  );
}
