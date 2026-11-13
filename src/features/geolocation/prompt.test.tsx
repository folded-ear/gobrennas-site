import { PreferenceValueFragmentDoc } from "@/hooks/use-preference/__generated__/preferenceValue.generated";
import { DoSetPreferenceDocument } from "@/hooks/use-set-preference/__generated__/doSetPreference.generated";
import { InitializeDeviceKeyDocument } from "@/lib/apollo/__generated__/initializeDeviceKey.generated";
import { addDays, localDate } from "@/lib/dates";
import { PREF_GEOLOCATION_REFUSED_AT } from "@/lib/preferences";
import {
  act,
  buildInMemoryCache,
  render,
  screen,
  userEvent,
  waitFor,
} from "@/test";
import { MockLink } from "@apollo/client/testing";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GeolocationPrompt, REFUSAL_QUIET_DAYS } from "./prompt";
import { installFakeGeolocation } from "./test/fake-geolocation";

type Cache = ReturnType<typeof buildInMemoryCache>;

const DEVICE_KEY = "a-device-key";
const OFFER = "Automatically order your list for the store you’re at?";
const THE_PREF = {
  __typename: "UserPreference" as const,
  name: PREF_GEOLOCATION_REFUSED_AT,
};

/** I build a cache whose refusal preference has the given value. */
function cacheRefusedAt(value: string | null): Cache {
  const cache = buildInMemoryCache();
  cache.writeQuery({
    query: InitializeDeviceKeyDocument,
    data: { deviceKey: DEVICE_KEY },
  });
  cache.writeFragment({
    id: cache.identify(THE_PREF),
    fragment: PreferenceValueFragmentDoc,
    data: { __typename: "UserPreference", value },
  });
  return cache;
}

function readRefusedAt(cache: Cache) {
  return cache.readFragment({
    id: cache.identify(THE_PREF),
    fragment: PreferenceValueFragmentDoc,
  })?.value;
}

/** I answer the save of a refusal today. */
function refusedToday(): MockLink.MockedResponse {
  const value = localDate();
  return {
    request: {
      query: DoSetPreferenceDocument,
      variables: {
        name: PREF_GEOLOCATION_REFUSED_AT,
        value,
        deviceKey: DEVICE_KEY,
      },
    },
    result: {
      data: {
        profile: {
          __typename: "ProfileMutation",
          setPreference: { ...THE_PREF, value },
        },
      },
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GeolocationPrompt", () => {
  it("offers to use the location while the browser would ask", () => {
    render(<GeolocationPrompt permission="prompt" />, {
      cache: cacheRefusedAt(null),
    });

    expect(screen.getByText(OFFER)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Use location" }),
    ).toBeInTheDocument();
  });

  it.each([["granted"], ["denied"], [null]] as const)(
    "offers nothing while the permission is %o",
    (permission) => {
      render(<GeolocationPrompt permission={permission} />, {
        cache: cacheRefusedAt(null),
      });

      expect(screen.queryByText(OFFER)).not.toBeInTheDocument();
    },
  );

  it("offers nothing when turned down within the quiet period", () => {
    const refusedAt = addDays(localDate(), -REFUSAL_QUIET_DAYS);
    render(<GeolocationPrompt permission="prompt" />, {
      cache: cacheRefusedAt(refusedAt),
    });

    expect(screen.queryByText(OFFER)).not.toBeInTheDocument();
  });

  it("offers again once the quiet period is over", () => {
    const refusedAt = addDays(localDate(), -REFUSAL_QUIET_DAYS - 1);
    render(<GeolocationPrompt permission="prompt" />, {
      cache: cacheRefusedAt(refusedAt),
    });

    expect(screen.getByText(OFFER)).toBeInTheDocument();
  });

  it("records a dismissal as refused today, and goes away", async () => {
    const cache = cacheRefusedAt(null);
    render(<GeolocationPrompt permission="prompt" />, {
      cache,
      mocks: [refusedToday()],
    });

    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(screen.queryByText(OFFER)).not.toBeInTheDocument();
    await waitFor(() => expect(readRefusedAt(cache)).toBe(localDate()));
  });

  it("stays gone when a dismissal can't be saved", async () => {
    render(<GeolocationPrompt permission="prompt" />, {
      cache: cacheRefusedAt(null),
    });

    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(
      await screen.findByText("Couldn’t save your change"),
    ).toBeInTheDocument();
    expect(screen.queryByText(OFFER)).not.toBeInTheDocument();
  });

  it("records turning down the browser's prompt as refused today", async () => {
    const geo = installFakeGeolocation();
    const cache = cacheRefusedAt(null);
    render(<GeolocationPrompt permission="prompt" />, {
      cache,
      mocks: [refusedToday()],
    });

    await userEvent.click(screen.getByRole("button", { name: "Use location" }));
    act(() => geo.refuse());

    await waitFor(() => expect(readRefusedAt(cache)).toBe(localDate()));
  });

  it("records the permission being denied as refused today", async () => {
    const cache = cacheRefusedAt(null);
    const { rerender } = render(<GeolocationPrompt permission="granted" />, {
      cache,
      mocks: [refusedToday()],
    });

    rerender(<GeolocationPrompt permission="denied" />);

    await waitFor(() => expect(readRefusedAt(cache)).toBe(localDate()));
  });
});
