"use client";

import { fragments } from "@/data/fragments";
import { ApolloLink, HttpLink, setLogVerbosity } from "@apollo/client";
import {
  ApolloClient,
  ApolloNextAppProvider,
  InMemoryCache,
} from "@apollo/client-integration-nextjs";
import { createFragmentRegistry } from "@apollo/client/cache";
import { type Cookies, useCookies } from "next-client-cookies";
import { useCallback } from "react";

setLogVerbosity("debug");

function makeClient(cookies: Cookies) {
  const httpLink = new HttpLink({
    uri: `${process.env.NEXT_PUBLIC_API_BASE_URL}/graphql`,
    credentials: "include",
    fetchOptions: {},
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
    link: ApolloLink.from([authMiddleware, httpLink]),
    devtools: {
      enabled: true,
    },
  });
}

// you need to create a component to wrap your app in
export function ApolloWrapper({ children }: React.PropsWithChildren) {
  const cookies = useCookies();

  const handleMakeClient = useCallback(() => makeClient(cookies), [cookies]);

  return (
    <ApolloNextAppProvider makeClient={handleMakeClient}>
      {children}
    </ApolloNextAppProvider>
  );
}
