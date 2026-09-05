import { usePreference } from "@/hooks/use-preference";
import { PreferenceValueFragmentDoc } from "@/hooks/use-preference/__generated__/preferenceValue.generated";
import { useSetPreference } from "@/hooks/use-set-preference";
import { InitializeDeviceKeyDocument } from "@/lib/apollo/__generated__/initializeDeviceKey.generated";
import { buildInMemoryCache } from "@/lib/apollo/build-in-memory-cache";
import { ApolloClient, ApolloLink, Operation } from "@apollo/client";
import { LocalState } from "@apollo/client/local-state";
import { ApolloProvider } from "@apollo/client/react";
import { MockLink } from "@apollo/client/testing";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DoSetPreferenceDocument } from "./__generated__/doSetPreference.generated";

const DEVICE_KEY = "a-device-key";
const PREF = "somePreference";
const THE_PREF = { __typename: "UserPreference" as const, name: PREF };

function Probe() {
  const [setPreference] = useSetPreference(PREF);
  return (
    <button onClick={() => setPreference("new")}>{usePreference(PREF)}</button>
  );
}

function renderProbe(seedDeviceKey: boolean) {
  const cache = buildInMemoryCache();
  if (seedDeviceKey) {
    // this is what apollo-rsc.ts writes, and what reaches the browser cache
    // through getUserProfileRsc's own `deviceKey` selection
    cache.writeQuery({
      query: InitializeDeviceKeyDocument,
      data: { deviceKey: DEVICE_KEY },
    });
  }
  cache.writeFragment({
    id: cache.identify(THE_PREF),
    fragment: PreferenceValueFragmentDoc,
    data: { __typename: "UserPreference", value: "old" },
  });

  const seen: Operation[] = [];
  const client = new ApolloClient({
    cache,
    localState: new LocalState(),
    link: ApolloLink.from([
      new ApolloLink((operation, forward) => {
        seen.push(operation);
        return forward(operation);
      }),
      new MockLink([
        {
          request: {
            query: DoSetPreferenceDocument,
            variables: { name: PREF, value: "new", deviceKey: DEVICE_KEY },
          },
          result: {
            data: {
              profile: {
                __typename: "ProfileMutation",
                setPreference: {
                  __typename: "UserPreference",
                  name: PREF,
                  value: "new",
                },
              },
            },
          },
        },
      ]),
    ]),
  });

  render(
    <ApolloProvider client={client}>
      <Probe />
    </ApolloProvider>,
  );
  return { seen, button: screen.getByRole("button") };
}

describe("useSetPreference", () => {
  it("sends the device key the cache was seeded with", async () => {
    const { seen, button } = renderProbe(true);

    button.click();

    await waitFor(() => expect(seen).toHaveLength(1));
    expect(seen[0].variables).toEqual({
      name: PREF,
      value: "new",
      deviceKey: DEVICE_KEY,
    });
  });

  it("makes the new value readable through usePreference", async () => {
    const { button } = renderProbe(true);

    button.click();

    await waitFor(() => expect(button).toHaveTextContent("new"));
  });

  it("fails rather than falling back when the device key is absent", async () => {
    const { seen, button } = renderProbe(false);

    button.click();

    // `deviceKey @client` has no resolver; it is only ever a cache read, so an
    // unseeded cache aborts the mutation instead of sending the "" default
    await waitFor(() => expect(button).toHaveTextContent("old"));
    expect(seen).toHaveLength(0);
  });
});
