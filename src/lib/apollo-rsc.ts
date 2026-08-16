import { graphqlUri } from "@/constants";
import { COOKIE_DEVICE_KEY } from "@/filters/device-key-cookie";
import { buildApolloLink } from "@/lib/apollo/build-apollo-link";
import { buildInMemoryCache } from "@/lib/apollo/build-in-memory-cache";
import { HttpLink } from "@apollo/client";
import {
  ApolloClient,
  registerApolloClient,
} from "@apollo/client-integration-nextjs";
import { LocalState } from "@apollo/client/local-state";
import { cookies } from "next/headers";
import { InitializeDeviceKeyDocument } from "./apollo/__generated__/initializeDeviceKey.generated";

export const { getClient, query, PreloadQuery } = registerApolloClient(
  async () => {
    const [kookies, gqlUri] = await Promise.all([cookies(), graphqlUri()]);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const token = kookies.get("FTOKEN")?.value;
    if (token) headers.authorization = `Bearer ${token}`;

    const httpLink = new HttpLink({
      uri: gqlUri,
      credentials: "include",
      headers,
      fetchOptions: {
        // you can pass additional options that should be passed to `fetch` here,
        // e.g. Next.js-related `fetch` options regarding caching and revalidation
        // see https://nextjs.org/docs/app/api-reference/functions/fetch#fetchurl-options
      },
    });

    const cache = buildInMemoryCache();
    cache.writeQuery({
      query: InitializeDeviceKeyDocument,
      data: {
        deviceKey: kookies.get(COOKIE_DEVICE_KEY)?.value!,
      },
      broadcast: false,
    });

    return new ApolloClient({
      cache,
      localState: new LocalState(),
      link: buildApolloLink("rsc", httpLink),
      devtools: {
        enabled: true,
      },
    });
  },
);
