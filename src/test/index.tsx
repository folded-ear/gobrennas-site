import { buildInMemoryCache } from "@/lib/apollo/build-in-memory-cache";
import { ThemeProvider } from "@/providers/theme-provider";
import { ApolloClient, FragmentType } from "@apollo/client";
import { LocalState } from "@apollo/client/local-state";
import { GraphQLCodegenDataMasking } from "@apollo/client/masking";
import { ApolloProvider } from "@apollo/client/react";
import { MockedResponse, MockLink } from "@apollo/client/testing";
import { StoreObject } from "@apollo/client/utilities";
import { TypedDocumentNode } from "@graphql-typed-document-node/core";
import {
  RenderOptions,
  RenderResult,
  render as rtlRender,
} from "@testing-library/react";
import { ReactElement, ReactNode } from "react";

export { buildInMemoryCache } from "@/lib/apollo/build-in-memory-cache";
export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";

type Cache = ReturnType<typeof buildInMemoryCache>;

// The codegen flavour, matching what this app declares in
// src/lib/apollo/apollo-client.d.ts. The generic `Unmasked` doesn't
// resolve to it while TData is still open.
type Unmasked<TData> = GraphQLCodegenDataMasking.Unmasked<TData>;

export type RenderWithProviders = Omit<RenderOptions, "wrapper"> & {
  /**
   * The cache to render against, seeded however the test needs. Left out,
   * I build an empty one.
   */
  cache?: Cache;
  mocks?: ReadonlyArray<MockedResponse>;
};

/**
 * I render into the providers the app really wraps its client tree in, on
 * a client configured the way production configures one, so a component
 * under test meets the conditions it meets in production.
 */
export function render(
  ui: ReactElement,
  { cache, mocks, ...options }: RenderWithProviders = {},
): RenderResult {
  const client = new ApolloClient({
    // Production sets this (src/lib/apollo-browser-and-ssr.tsx), and
    // MockedProvider has no way to. Without it a component can read a
    // field its own fragment never selected and the test still passes.
    dataMasking: true,
    cache: cache ?? buildInMemoryCache(),
    localState: new LocalState(),
    link: new MockLink(mocks ?? []),
  });

  function Providers({ children }: { children: ReactNode }) {
    return (
      <ApolloProvider client={client}>
        <ThemeProvider>{children}</ThemeProvider>
      </ApolloProvider>
    );
  }

  return rtlRender(ui, { wrapper: Providers, ...options });
}

export type SeedOptions = {
  /** Where to write, when the data can't identify itself. */
  id?: string;
  /** Variables the fragment's own fields take, if any. */
  variables?: Record<string, unknown>;
};

/**
 * I write one fragment's data and return the prop to pass in its place,
 * so a seeded fragment and the prop naming it cannot drift apart.
 *
 * I am a convenience over `cache.writeFragment`, not a gate in front of
 * it. Anything else a test needs in the cache, it writes itself.
 */
export function seedFragment<TData>(
  cache: Cache,
  fragment: TypedDocumentNode<TData, unknown>,
  fragmentName: string,
  data: Unmasked<TData>,
  { id, variables }: SeedOptions = {},
): FragmentType<TData> {
  const cacheId = id ?? cache.identify(data as StoreObject);
  if (cacheId === undefined) {
    throw new Error(
      `Cannot identify "${fragmentName}" data to seed it. Its fragment` +
        ` probably doesn't select "id", so pass a cache id explicitly,` +
        ` e.g. seedFragment(cache, doc, "userAvatar", data,` +
        ` { id: "User:1" }).`,
    );
  }
  cache.writeFragment({ fragment, fragmentName, id: cacheId, variables, data });
  // A cache id is one of the things useFragment takes as its `from`.
  return cacheId as unknown as FragmentType<TData>;
}
