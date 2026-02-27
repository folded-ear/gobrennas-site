"use client";

import { COOKIE_DEVICE_KEY } from "@/filters/device-key-cookie";
import { buildApolloLink } from "@/lib/apollo/build-apollo-link";
import { buildInMemoryCache } from "@/lib/apollo/build-in-memory-cache";
import { initializeCache } from "@/lib/apollo/initialize-cache";
import { HttpLink, setLogVerbosity } from "@apollo/client";
import {
  ApolloClient,
  ApolloNextAppProvider,
} from "@apollo/client-integration-nextjs";
import { LocalState } from "@apollo/client/local-state";
import { useCookies } from "next-client-cookies";
import React, { useCallback } from "react";

setLogVerbosity("debug");

type ApolloWrapperProps = React.PropsWithChildren & {
  graphqlUri: string;
};

// you need to create a component to wrap your app in
export function ApolloWrapper({ graphqlUri, children }: ApolloWrapperProps) {
  const kookies = useCookies();

  const handleMakeClient = useCallback(() => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const token = kookies.get("FTOKEN");
    if (token) headers.authorization = `Bearer ${token}`;

    const httpLink = new HttpLink({
      uri: graphqlUri,
      credentials: "include",
      headers,
      fetchOptions: {},
    });

    const cache = buildInMemoryCache();
    initializeCache(cache, {
      deviceKey: kookies.get(COOKIE_DEVICE_KEY)!,
    });
    return new ApolloClient({
      dataMasking: true,
      cache,
      localState: new LocalState(),
      link: buildApolloLink("browser-and-ssr", httpLink),
      devtools: {
        enabled: true,
      },
    });
  }, [graphqlUri, kookies]);

  return (
    <ApolloNextAppProvider makeClient={handleMakeClient}>
      {children}
    </ApolloNextAppProvider>
  );
}
