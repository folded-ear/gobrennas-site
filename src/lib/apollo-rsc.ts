import { graphqlUri } from "@/app/(public)/constants";
import { buildApolloLink } from "@/lib/apollo/build-apollo-link";
import { buildInMemoryCache } from "@/lib/apollo/build-in-memory-cache";
import { HttpLink } from "@apollo/client";
import {
  ApolloClient,
  registerApolloClient,
} from "@apollo/client-integration-nextjs";
import { cookies } from "next/headers";

export const { getClient, query, PreloadQuery } = registerApolloClient(
  async () => {
    const kookies = await cookies();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const token = kookies.get("FTOKEN")?.value;
    if (token) headers.authorization = `Bearer ${token}`;

    const httpLink = new HttpLink({
      uri: await graphqlUri(),
      credentials: "include",
      headers,
      fetchOptions: {
        // you can pass additional options that should be passed to `fetch` here,
        // e.g. Next.js-related `fetch` options regarding caching and revalidation
        // see https://nextjs.org/docs/app/api-reference/functions/fetch#fetchurl-options
      },
    });

    return new ApolloClient({
      cache: buildInMemoryCache(),
      link: buildApolloLink("rsc", httpLink),
      devtools: {
        enabled: true,
      },
    });
  },
);
