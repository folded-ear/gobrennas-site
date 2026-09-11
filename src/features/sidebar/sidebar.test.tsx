import { PreferenceValueFragmentDoc } from "@/hooks/use-preference/__generated__/preferenceValue.generated";
import { DoSetPreferenceDocument } from "@/hooks/use-set-preference/__generated__/doSetPreference.generated";
import { InitializeDeviceKeyDocument } from "@/lib/apollo/__generated__/initializeDeviceKey.generated";
import {
  formatBoolean,
  PREF_ACTIVE_PLAN,
  PREF_NAV_COLLAPSED,
} from "@/lib/preferences";
import {
  buildInMemoryCache,
  render,
  screen,
  userEvent,
  waitFor,
  within,
} from "@/test";
import { MockLink } from "@apollo/client/testing";
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
const NAV_COLLAPSED_PREF = {
  __typename: "UserPreference" as const,
  name: PREF_NAV_COLLAPSED,
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

function setPreferenceMock(
  name: string,
  value: string,
): MockLink.MockedResponse {
  return {
    request: {
      query: DoSetPreferenceDocument,
      variables: { name, value, deviceKey: DEVICE_KEY },
    },
    result: {
      data: {
        profile: {
          __typename: "ProfileMutation",
          setPreference: {
            __typename: "UserPreference",
            name,
            value,
          },
        },
      },
    },
  };
}

function seedPreference(
  cache: ReturnType<typeof buildInMemoryCache>,
  pref: { __typename: "UserPreference"; name: string },
  value: string,
) {
  cache.writeFragment({
    id: cache.identify(pref),
    fragment: PreferenceValueFragmentDoc,
    data: { __typename: "UserPreference", value },
  });
}

// the sidebar's query is warmed into the cache rather than served over a link,
// so a render is synchronous and asserts on this repo's cache configuration
// instead of on Apollo's fetching
function renderSidebar({
  plans,
  activePlanId,
  navCollapsed,
  mocks = [],
}: {
  plans: ReturnType<typeof plan>[];
  activePlanId?: string;
  navCollapsed?: string;
  mocks?: MockLink.MockedResponse[];
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
    seedPreference(cache, ACTIVE_PLAN_PREF, activePlanId);
  }
  if (navCollapsed !== undefined) {
    seedPreference(cache, NAV_COLLAPSED_PREF, navCollapsed);
  }
  render(<Sidebar />, { cache, mocks });
  return cache;
}

function toggleCollapse(name: "Collapse sidebar" | "Expand sidebar") {
  return userEvent.click(screen.getByRole("button", { name }));
}

function section(title: string) {
  return screen.getByText(title).closest("div")!.parentElement!;
}

function activePlanNames() {
  return ALL_PLANS.map((it) => screen.queryByText(it.name))
    .filter((el) => el?.closest("a")?.className.includes(ACTIVE_CLASS))
    .map((el) => el!.textContent);
}

function preferenceValue(
  cache: ReturnType<typeof buildInMemoryCache>,
  pref: { __typename: "UserPreference"; name: string },
) {
  return cache.readFragment<{ value: string }>({
    fragment: PreferenceValueFragmentDoc,
    from: pref,
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

  it("shows plans as avatars alone once collapsed", async () => {
    renderSidebar({
      plans: [plan(WEEKNIGHTS, true)],
      mocks: [setPreferenceMock(PREF_NAV_COLLAPSED, formatBoolean(true))],
    });

    await toggleCollapse("Collapse sidebar");

    await waitFor(() => expect(screen.queryByText(WEEKNIGHTS.name)).toBeNull());
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
    const cache = renderSidebar({
      plans: [plan(WEEKNIGHTS, true), plan(FEAST_DAY, true)],
      activePlanId: FEAST_DAY.id,
      mocks: [setPreferenceMock(PREF_ACTIVE_PLAN, WEEKNIGHTS.id)],
    });

    screen.getByText(WEEKNIGHTS.name).click();

    // the cache read is the non-optimistic one, so this waits out the round
    // trip the optimistic update papers over
    await waitFor(() =>
      expect(preferenceValue(cache, ACTIVE_PLAN_PREF)).toBe(WEEKNIGHTS.id),
    );
    expect(activePlanNames()).toEqual([WEEKNIGHTS.name]);
  });
});

describe("Sidebar collapse", () => {
  const ONLY_PLAN = { plans: [plan(WEEKNIGHTS, true)] };

  it("starts collapsed when the preference says it is", () => {
    renderSidebar({ ...ONLY_PLAN, navCollapsed: formatBoolean(true) });

    expect(screen.queryByText("Library")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Expand sidebar" }),
    ).toBeVisible();
  });

  it("starts expanded when the preference says it is not", () => {
    renderSidebar({ ...ONLY_PLAN, navCollapsed: formatBoolean(false) });

    expect(screen.getByText("Library")).toBeVisible();
  });

  it("starts expanded when the preference is unset", () => {
    renderSidebar(ONLY_PLAN);

    expect(screen.getByText("Library")).toBeVisible();
  });

  it("records collapsing in the preference", async () => {
    const cache = renderSidebar({
      ...ONLY_PLAN,
      navCollapsed: formatBoolean(false),
      mocks: [setPreferenceMock(PREF_NAV_COLLAPSED, formatBoolean(true))],
    });

    await toggleCollapse("Collapse sidebar");

    await waitFor(() =>
      expect(preferenceValue(cache, NAV_COLLAPSED_PREF)).toBe(
        formatBoolean(true),
      ),
    );
    expect(screen.queryByText("Library")).toBeNull();
  });

  it("records expanding in the preference", async () => {
    const cache = renderSidebar({
      ...ONLY_PLAN,
      navCollapsed: formatBoolean(true),
      mocks: [setPreferenceMock(PREF_NAV_COLLAPSED, formatBoolean(false))],
    });

    await toggleCollapse("Expand sidebar");

    await waitFor(() =>
      expect(preferenceValue(cache, NAV_COLLAPSED_PREF)).toBe(
        formatBoolean(false),
      ),
    );
    expect(screen.getByText("Library")).toBeVisible();
  });
});
