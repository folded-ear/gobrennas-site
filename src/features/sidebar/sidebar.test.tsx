import { PreferenceValueFragmentDoc } from "@/hooks/use-preference/__generated__/preferenceValue.generated";
import { DoSetPreferenceDocument } from "@/hooks/use-set-preference/__generated__/doSetPreference.generated";
import { InitializeDeviceKeyDocument } from "@/lib/apollo/__generated__/initializeDeviceKey.generated";
import { buildInMemoryCache } from "@/lib/apollo/build-in-memory-cache";
import { PREF_ACTIVE_PLAN } from "@/lib/preferences";
import { ApolloClient } from "@apollo/client";
import { LocalState } from "@apollo/client/local-state";
import { ApolloProvider } from "@apollo/client/react";
import { MockLink, MockedResponse } from "@apollo/client/testing";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GetSidebarDocument } from "./__generated__/getSidebar.generated";
import { Sidebar } from "./index";

const WEEKNIGHTS = { id: "1", name: "Weeknights", color: "#f5cd06" };
const FEAST_DAY = { id: "2", name: "Feast Day", color: "#89ac66" };
const NEIGHBOR = { id: "3", name: "Neighbor Plan", color: "#9cb7da" };
const ALL_PLANS = [WEEKNIGHTS, FEAST_DAY, NEIGHBOR];

const ACTIVE_CLASS = "text-accent/80";
const DEVICE_KEY = "a-device-key";
const ACTIVE_PLAN_PREF = {
  __typename: "UserPreference" as const,
  name: PREF_ACTIVE_PLAN,
};

let pathname = "/planner";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
}));

type PlanFixture = (typeof ALL_PLANS)[number];

function plan(it: PlanFixture, mine: boolean) {
  return { __typename: "Plan" as const, ...it, mine };
}

function setPreferenceMock(value: string): MockedResponse {
  return {
    request: {
      query: DoSetPreferenceDocument,
      variables: { name: PREF_ACTIVE_PLAN, value, deviceKey: DEVICE_KEY },
    },
    result: {
      data: {
        profile: {
          __typename: "ProfileMutation",
          setPreference: {
            __typename: "UserPreference",
            name: PREF_ACTIVE_PLAN,
            value,
          },
        },
      },
    },
  };
}

// the sidebar's query is warmed into the cache rather than served over a link,
// so a render is synchronous and asserts on this repo's cache configuration
// instead of on Apollo's fetching
function renderSidebar({
  plans,
  activePlanId,
  mocks = [],
}: {
  plans: ReturnType<typeof plan>[];
  activePlanId?: string;
  mocks?: MockedResponse[];
}) {
  const cache = buildInMemoryCache();
  // `deviceKey @client` is a cache read with no resolver behind it, so setting
  // a preference only works once this is present
  cache.writeQuery({
    query: InitializeDeviceKeyDocument,
    data: { deviceKey: DEVICE_KEY },
  });
  cache.writeQuery({
    query: GetSidebarDocument,
    data: { planner: { __typename: "PlannerQuery", plans } },
  });
  if (activePlanId) {
    cache.writeFragment({
      id: cache.identify(ACTIVE_PLAN_PREF),
      fragment: PreferenceValueFragmentDoc,
      data: { __typename: "UserPreference", value: activePlanId },
    });
  }
  const client = new ApolloClient({
    dataMasking: true,
    cache,
    localState: new LocalState(),
    link: new MockLink(mocks),
  });
  const Wrapper = ({ children }: PropsWithChildren) => (
    <ApolloProvider client={client}>{children}</ApolloProvider>
  );
  render(<Sidebar />, { wrapper: Wrapper });
  return client;
}

function collapse() {
  act(() => {
    document.querySelector<HTMLButtonElement>("aside > button")!.click();
  });
}

function section(title: string) {
  return screen.getByText(title).closest("div")!.parentElement!;
}

function activePlanNames() {
  return ALL_PLANS.map((it) => screen.queryByText(it.name))
    .filter((el) => el?.closest("a")?.className.includes(ACTIVE_CLASS))
    .map((el) => el!.textContent);
}

function activePlanPreference(client: ApolloClient) {
  return client.cache.readFragment<{ value: string }>({
    fragment: PreferenceValueFragmentDoc,
    from: ACTIVE_PLAN_PREF,
  })?.value;
}

describe("Sidebar plans", () => {
  beforeEach(() => {
    pathname = "/planner";
  });

  it("splits plans into owned and shared sections", () => {
    renderSidebar({
      plans: [
        plan(WEEKNIGHTS, true),
        plan(NEIGHBOR, false),
        plan(FEAST_DAY, true),
      ],
    });

    expect(
      within(section("My Plans")).getByText(WEEKNIGHTS.name),
    ).toBeVisible();
    expect(within(section("My Plans")).getByText(FEAST_DAY.name)).toBeVisible();
    expect(
      within(section("Shared Plans")).getByText(NEIGHBOR.name),
    ).toBeVisible();
    expect(screen.getAllByText(WEEKNIGHTS.name)).toHaveLength(1);
  });

  it("omits the owned section when every plan is shared", () => {
    renderSidebar({ plans: [plan(NEIGHBOR, false)] });

    expect(screen.getByText("Shared Plans")).toBeVisible();
    expect(screen.queryByText("My Plans")).toBeNull();
  });

  it("omits the shared section when every plan is owned", () => {
    renderSidebar({ plans: [plan(WEEKNIGHTS, true)] });

    expect(screen.getByText("My Plans")).toBeVisible();
    expect(screen.queryByText("Shared Plans")).toBeNull();
  });

  it("shows plans as avatars alone once collapsed", () => {
    renderSidebar({ plans: [plan(WEEKNIGHTS, true)] });

    collapse();

    expect(screen.queryByText(WEEKNIGHTS.name)).toBeNull();
    expect(screen.getByTitle(WEEKNIGHTS.name)).toBeVisible();
  });

  it("marks the plan named by the preference as active", () => {
    renderSidebar({
      plans: [plan(WEEKNIGHTS, true), plan(FEAST_DAY, true)],
      activePlanId: FEAST_DAY.id,
    });

    expect(activePlanNames()).toEqual([FEAST_DAY.name]);
  });

  it("keeps the active plan marked while off the planner route", () => {
    pathname = "/recipes";
    renderSidebar({
      plans: [plan(WEEKNIGHTS, true), plan(FEAST_DAY, true)],
      activePlanId: FEAST_DAY.id,
    });

    expect(activePlanNames()).toEqual([FEAST_DAY.name]);
  });

  it("makes the clicked plan the active one", async () => {
    const client = renderSidebar({
      plans: [plan(WEEKNIGHTS, true), plan(FEAST_DAY, true)],
      activePlanId: FEAST_DAY.id,
      mocks: [setPreferenceMock(WEEKNIGHTS.id)],
    });

    screen.getByText(WEEKNIGHTS.name).click();

    await waitFor(() => expect(activePlanNames()).toEqual([WEEKNIGHTS.name]));
    expect(activePlanPreference(client)).toBe(WEEKNIGHTS.id);
  });
});
