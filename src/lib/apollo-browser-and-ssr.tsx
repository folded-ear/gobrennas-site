"use client";

import { buildApolloLink } from "@/lib/apollo/build-apollo-link";
import { buildInMemoryCache } from "@/lib/apollo/build-in-memory-cache";
import { ApolloLink, HttpLink, setLogVerbosity } from "@apollo/client";
import {
  ApolloClient,
  ApolloNextAppProvider,
} from "@apollo/client-integration-nextjs";
import { type Cookies, useCookies } from "next-client-cookies";
import React, { useCallback } from "react";

setLogVerbosity("debug");

function makeClient(graphqlUri: string, kookies: Cookies) {
  const httpLink = new HttpLink({
    uri: graphqlUri,
    credentials: "include",
    fetchOptions: {},
  });

  const authMiddleware = new ApolloLink((operation, forward) => {
    const token = kookies.get("FTOKEN");
    operation.setContext(({ headers = {} }) => ({
      headers: {
        ...headers,
        cookies: `FTOKEN=${token}`,
      },
    }));
    return forward(operation);
  });

  return new ApolloClient({
    cache: buildInMemoryCache(),
    link: buildApolloLink("browser-and-ssr", authMiddleware, httpLink),
    devtools: {
      enabled: true,
    },
  });
}

type ApolloWrapperProps = React.PropsWithChildren & {
  graphqlUri: string;
};

// you need to create a component to wrap your app in
export function ApolloWrapper({ graphqlUri, children }: ApolloWrapperProps) {
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
