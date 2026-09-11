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

type ProbeOptions = {
  seedDeviceKey?: boolean;
  mock?: Partial<MockLink.MockedResponse>;
};

function renderProbe({ seedDeviceKey = true, mock }: ProbeOptions = {}) {
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
          ...mock,
        },
      ]),
    ]),
  });

  render(
    <ApolloProvider client={client}>
      <Probe />
    </ApolloProvider>,
  );
  return { cache, seen, button: screen.getByRole("button") };
}

describe("useSetPreference", () => {
  it("sends the device key the cache was seeded with", async () => {
    const { seen, button } = renderProbe();

    button.click();

    await waitFor(() => expect(seen).toHaveLength(1));
    expect(seen[0].variables).toEqual({
      name: PREF,
      value: "new",
      deviceKey: DEVICE_KEY,
    });
  });

  it("makes the new value readable through usePreference", async () => {
    const { button } = renderProbe();

    button.click();

    await waitFor(() => expect(button).toHaveTextContent("new"));
  });

  it("fails rather than falling back when the device key is absent", async () => {
    const { seen, button } = renderProbe({ seedDeviceKey: false });

    button.click();

    // `deviceKey @client` has no resolver; it is only ever a cache read, so an
    // unseeded cache aborts the mutation instead of sending the "" default
    await waitFor(() => expect(button).toHaveTextContent("old"));
    expect(seen).toHaveLength(0);
  });

  it("shows the new value while the server has yet to answer", async () => {
    const { button } = renderProbe({ mock: { delay: Infinity } });

    button.click();

    await waitFor(() => expect(button).toHaveTextContent("new"));
  });

  it("restores the old value when the server rejects the change", async () => {
    // the delay keeps the guess on screen long enough to see, so the
    // rollback is what the second assertion catches
    const { button } = renderProbe({
      mock: { error: new Error("nope"), delay: 20 },
    });

    button.click();

    await waitFor(() => expect(button).toHaveTextContent("new"));
    await waitFor(() => expect(button).toHaveTextContent("old"));
  });

  it("leaves the cached device key alone while guessing", async () => {
    const { cache, button } = renderProbe({ mock: { delay: Infinity } });

    button.click();

    await waitFor(() => expect(button).toHaveTextContent("new"));
    expect(cache.readQuery({ query: InitializeDeviceKeyDocument })).toEqual({
      deviceKey: DEVICE_KEY,
    });
  });
});
