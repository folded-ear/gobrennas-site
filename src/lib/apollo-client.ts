import { graphqlUri } from "@/app/(public)/constants";
import { fragments } from "@/data/fragments";
import {
  ApolloLink,
  CombinedGraphQLErrors,
  CombinedProtocolErrors,
  HttpLink,
  ServerError,
  ServerParseError,
} from "@apollo/client";
import {
  ApolloClient,
  InMemoryCache,
  registerApolloClient,
} from "@apollo/client-integration-nextjs";
import { createFragmentRegistry } from "@apollo/client/cache";
import { ErrorLink } from "@apollo/client/link/error";
import { cookies } from "next/headers";

export const { getClient, query, PreloadQuery } = registerApolloClient(
  async () => {
    const kookies = await cookies();

    // Log any GraphQL errors, protocol errors, or network error that occurred
    const errorLink = new ErrorLink(({ error }) => {
      if (CombinedGraphQLErrors.is(error)) {
        error.errors.forEach(({ extensions, message, locations, path }) => {
          console.log(
            `[GraphQL error - client]: Message: ${message}, Location: ${locations}, Path: ${path}`,
          );
        });
      } else if (CombinedProtocolErrors.is(error)) {
        error.errors.forEach(({ message, extensions }) =>
          console.log(
            `[Protocol error - client]: Message: ${message}, Extensions: ${JSON.stringify(
              extensions,
            )}`,
          ),
        );
      } else if (ServerError.is(error)) {
        console.error(`[Server error - client]: ${error}`, error.statusCode);
      } else if (ServerParseError.is(error)) {
        console.error(`[Parse error - client]: ${error}`, error.statusCode);
      } else {
        console.error(`[Network error - client]: ${error}`);
      }
    });

    const httpLink = new HttpLink({
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
    });

    return new ApolloClient({
      cache: new InMemoryCache({
        fragments: createFragmentRegistry(...fragments),
      }),
      devtools: {
        enabled: true,
      },
      link: ApolloLink.from([
        new ApolloLink((operation, forward) => {
          console.log("[Operation - client]:", operation);
          return forward(operation);
        }),
        errorLink,
        httpLink,
      ]),
    });
  },
);
