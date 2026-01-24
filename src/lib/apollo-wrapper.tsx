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

function makeClient(graphqlUri: string, cookies: Cookies) {
  const httpLink = new HttpLink({
    uri: graphqlUri,
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
