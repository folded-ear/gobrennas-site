"use server";

import { graphql } from "@/__graphql";
import { fetchGraphQL } from "@/lib/network";

export async function fetchUser() {
  return fetchGraphQL(
    graphql(`
      query me {
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
