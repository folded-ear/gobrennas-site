"use client";

import {
  GetUserProfileRscDocument,
  GetUserProfileRscQuery,
} from "@/data-rsc/get-user-profile/__generated__/getUserProfileRsc.generated";
import { buildApolloLink } from "@/lib/apollo/build-apollo-link";
import { buildInMemoryCache } from "@/lib/apollo/build-in-memory-cache";
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
  profileQuery?: GetUserProfileRscQuery;
};

// you need to create a component to wrap your app in
export function ApolloWrapper({
  graphqlUri,
  profileQuery,
  children,
}: ApolloWrapperProps) {
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
    if (profileQuery) {
      // copy this from RSC to browser-and-SSR
      cache.writeQuery({
        query: GetUserProfileRscDocument,
        data: profileQuery,
      });
    }
    return new ApolloClient({
      dataMasking: true,
      cache,
      localState: new LocalState(),
      link: buildApolloLink("browser-and-ssr", httpLink),
      devtools: {
        enabled: true,
      },
    });
  }, [graphqlUri, kookies, profileQuery]);

  return (
    <ApolloNextAppProvider makeClient={handleMakeClient}>
      {children}
    </ApolloNextAppProvider>
  );
}
