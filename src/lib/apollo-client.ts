import { graphqlUri } from "@/app/(public)/constants";
import { fragments } from "@/data/fragments";
import { HttpLink } from "@apollo/client";
import {
  ApolloClient,
  InMemoryCache,
  registerApolloClient,
} from "@apollo/client-integration-nextjs";
import { createFragmentRegistry } from "@apollo/client/cache";
import { cookies } from "next/headers";

export const { getClient, query, PreloadQuery } = registerApolloClient(
  async () => {
    const kookies = await cookies();

    return new ApolloClient({
      cache: new InMemoryCache({
        fragments: createFragmentRegistry(...fragments),
      }),
      devtools: {
        enabled: true,
      },
      link: new HttpLink({
        uri: await graphqlUri(),
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          cookie: `FTOKEN=${kookies.get("FTOKEN")?.value}`,
        },
        fetchOptions: {
          // you can pass additional options that should be passed to `fetch` here,
          // e.g. Next.js-related `fetch` options regarding caching and revalidation
          // see https://nextjs.org/docs/app/api-reference/functions/fetch#fetchurl-options
        },
      }),
    });
  },
);
