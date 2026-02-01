"use client";

import { fragments } from "@/data/fragments";
import {
  ApolloLink,
  CombinedGraphQLErrors,
  CombinedProtocolErrors,
  HttpLink,
  ServerError,
  ServerParseError,
  setLogVerbosity,
} from "@apollo/client";
import {
  ApolloClient,
  ApolloNextAppProvider,
  InMemoryCache,
} from "@apollo/client-integration-nextjs";
import { createFragmentRegistry } from "@apollo/client/cache";
import { ErrorLink } from "@apollo/client/link/error";
import { type Cookies, useCookies } from "next-client-cookies";
import React, { useCallback } from "react";

setLogVerbosity("debug");

function makeClient(graphqlUri: string, cookies: Cookies) {
  const httpLink = new HttpLink({
    uri: graphqlUri,
    credentials: "include",
    fetchOptions: {},
  });

  // Log any GraphQL errors, protocol errors, or network error that occurred
  const errorLink = new ErrorLink(({ error }) => {
    if (CombinedGraphQLErrors.is(error)) {
      error.errors.forEach(({ extensions, message, locations, path }) => {
        if (extensions?.classification === "UNAUTHORIZED") {
          // redirect("/");
        }
        console.log(
          `[GraphQL error - browser-and-ssr]: Message: ${message}, Location: ${locations}, Path: ${path}`,
        );
      });
    } else if (CombinedProtocolErrors.is(error)) {
      error.errors.forEach(({ message, extensions }) =>
        console.log(
          `[Protocol error - browser-and-ssr]: Message: ${message}, Extensions: ${JSON.stringify(
            extensions,
          )}`,
        ),
      );
    } else if (ServerError.is(error)) {
      console.error(`[Server error - wrappper]: ${error}`, error.statusCode);
    } else if (ServerParseError.is(error)) {
      console.error(
        `[Parse error - browser-and-ssr]: ${error}`,
        error.statusCode,
      );
    } else {
      console.error(`[Network error - browser-and-ssr]: ${error}`);
    }
  });

  const authMiddleware = new ApolloLink((operation, forward) => {
    const token = cookies.get("FTOKEN");
    operation.setContext(({ headers = {} }) => ({
      headers: {
        ...headers,
        cookies: `FTOKEN=${token}`,
      },
    }));
    return forward(operation);
  });

  return new ApolloClient({
    cache: new InMemoryCache({
      typePolicies: {
        LibraryQuery: {
          merge: false,
        },
      },
      fragments: createFragmentRegistry(...fragments),
    }),
    link: ApolloLink.from([
      new ApolloLink((operation, forward) => {
        console.log("[Operation - browser-and-ssr]:", operation);
        return forward(operation);
      }),
      authMiddleware,
      errorLink,
      httpLink,
    ]),
    devtools: {
      enabled: true,
    },
  });
}

type Props = {
  graphqlUri: string;
} & React.PropsWithChildren;

// you need to create a component to wrap your app in
export function ApolloWrapper({ graphqlUri, children }: Props) {
  const kookies = useCookies();

  const handleMakeClient = useCallback(
    () => makeClient(graphqlUri, kookies),
    [graphqlUri, kookies],
  );

  return (
    <ApolloNextAppProvider makeClient={handleMakeClient}>
      {children}
    </ApolloNextAppProvider>
  );
}
