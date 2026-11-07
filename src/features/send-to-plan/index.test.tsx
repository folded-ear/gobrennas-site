import { AccessLevel } from "@/__generated__/graphql";
import { VIEW_ONLY_HINT } from "@/components/plan-option";
import { PreferenceValueFragmentDoc } from "@/hooks/use-preference/__generated__/preferenceValue.generated";
import { PREF_ACTIVE_PLAN } from "@/lib/preferences";
import {
  buildInMemoryCache,
  render,
  screen,
  seedFragment,
  userEvent,
  within,
} from "@/test";
import type { Unmasked } from "@apollo/client";
import { MockedProviderProps } from "@apollo/client/testing/react";
import { describe, expect, it } from "vitest";
import { DoSendToPlanDocument } from "./__generated__/doSendToPlan.generated";
import {
  SendToPlanFragmentDoc,
  type SendToPlanFragment,
} from "./__generated__/sendToPlan.generated";
import { SendToPlan } from "./index";

type Plan = Unmasked<SendToPlanFragment>["planner"]["plans"][number];

const THIS_WEEK: Plan = {
  __typename: "Plan",
  id: "plan-1",
  name: "This Week",
  color: "#f5cd06",
  mine: true,
  grants: [],
};
const PARTY: Plan = {
  __typename: "Plan",
  id: "plan-2",
  name: "Block Party",
  color: "#89ac66",
  mine: false,
  grants: [
    {
      __typename: "AccessControlEntry",
      level: AccessLevel.CHANGE,
      user: { __typename: "User", id: "me", me: true },
    },
  ],
};
const PANTRY: Plan = {
  __typename: "Plan",
  id: "plan-3",
  name: "Mom's Pantry",
  color: "#9cb7da",
  mine: false,
  grants: [
    {
      __typename: "AccessControlEntry",
      level: AccessLevel.VIEW,
      user: { __typename: "User", id: "me", me: true },
    },
  ],
};
const PLANS = [PANTRY, PARTY, THIS_WEEK];

const recipeId = "recipe-1";
const sentItemId = "item-1";
const sentItemKey = `PlanItem:${sentItemId}`;
const sent = {
  data: {
    library: {
      __typename: "LibraryMutation" as const,
      sendRecipeToPlan: { __typename: "PlanItem" as const, id: sentItemId },
    },
  },
};

function sendTo(plan: Plan) {
  return {
    query: DoSendToPlanDocument,
    variables: { recipeId, planId: plan.id },
  };
}

const preferenceId = {
  __typename: "UserPreference",
  name: PREF_ACTIVE_PLAN,
};

type Options = {
  stored?: Plan;
  choosable?: boolean;
  mocks?: MockedProviderProps["mocks"];
};

function renderSendToPlan({
  stored = THIS_WEEK,
  choosable = false,
  mocks = [],
}: Options = {}) {
  const cache = buildInMemoryCache();
  seedFragment(
    cache,
    PreferenceValueFragmentDoc,
    "preferenceValue",
    { __typename: "UserPreference", value: stored.id },
    { id: cache.identify(preferenceId) },
  );
  // SendToPlan reads its fragment from ROOT_QUERY rather than a prop,
  // mirroring how its screen's query would have populated the cache.
  seedFragment(
    cache,
    SendToPlanFragmentDoc,
    "sendToPlan",
    { planner: { __typename: "PlannerQuery", plans: PLANS } },
    { id: "ROOT_QUERY" },
  );

  render(<SendToPlan recipeId={recipeId} choosable={choosable} />, {
    cache,
    mocks,
  });
  return cache;
}

function storedPlanId(cache: ReturnType<typeof buildInMemoryCache>) {
  return cache.readFragment({
    fragment: PreferenceValueFragmentDoc,
    id: cache.identify(preferenceId),
  })?.value;
}

async function openPlanMenu() {
  await userEvent.click(screen.getByRole("button", { name: "Choose a plan" }));
  return screen.findByRole("menu", { name: "Choose a plan" });
}

describe("SendToPlan", () => {
  it("shows the active plan's name", () => {
    renderSendToPlan();

    expect(
      screen.getByRole("button", { name: /this week/i }),
    ).toBeInTheDocument();
  });

  it("targets the first plan of my own when none is stored", () => {
    const cache = buildInMemoryCache();
    seedFragment(
      cache,
      SendToPlanFragmentDoc,
      "sendToPlan",
      { planner: { __typename: "PlannerQuery", plans: PLANS } },
      { id: "ROOT_QUERY" },
    );

    render(<SendToPlan recipeId={recipeId} />, { cache });

    expect(
      screen.getByRole("button", { name: /this week/i }),
    ).toBeInTheDocument();
  });

  it("sends the recipe to the plan and says so", async () => {
    const user = userEvent.setup();
    const cache = renderSendToPlan({
      mocks: [{ request: sendTo(THIS_WEEK), result: sent }],
    });

    expect(cache.extract()[sentItemKey]).toBeUndefined();

    await user.click(screen.getByRole("button", { name: /this week/i }));

    expect(await screen.findByText("Added to This Week")).toBeVisible();
    expect(cache.extract()[sentItemKey]).toBeDefined();
  });

  it("says so when the recipe can't be sent", async () => {
    const user = userEvent.setup();
    renderSendToPlan({
      mocks: [
        { request: sendTo(THIS_WEEK), error: new Error("Failed to fetch") },
      ],
    });

    await user.click(screen.getByRole("button", { name: /this week/i }));

    expect(
      await screen.findByText("Couldn’t add recipe to plan"),
    ).toBeVisible();
  });

  it("says so when the plan doesn't take the recipe", async () => {
    const user = userEvent.setup();
    renderSendToPlan({
      mocks: [
        {
          request: sendTo(THIS_WEEK),
          result: { errors: [{ message: "Plan not found" }] },
        },
      ],
    });

    await user.click(screen.getByRole("button", { name: /this week/i }));

    expect(
      await screen.findByText("Couldn’t add recipe to plan"),
    ).toBeVisible();
  });

  it("says so when no plan item comes back", async () => {
    const user = userEvent.setup();
    renderSendToPlan({
      mocks: [
        {
          request: sendTo(THIS_WEEK),
          result: {
            data: {
              library: {
                __typename: "LibraryMutation",
                sendRecipeToPlan: null,
              },
            },
          },
        },
      ],
    });

    await user.click(screen.getByRole("button", { name: /this week/i }));

    expect(
      await screen.findByText("Couldn’t add recipe to plan"),
    ).toBeVisible();
  });

  it("won't send to a view-only plan, and says why", async () => {
    const user = userEvent.setup();
    renderSendToPlan({ stored: PANTRY });
    const button = screen.getByRole("button", { name: /mom's pantry/i });

    expect(button).toHaveAttribute("aria-disabled", "true");

    await user.tab();

    expect(button).toHaveFocus();
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      VIEW_ONLY_HINT,
    );

    await user.click(button);

    expect(screen.queryByText("Sending...")).toBeNull();
    expect(button).toHaveTextContent("Mom's Pantry");
  });

  it("offers no other plans unless asked to", () => {
    renderSendToPlan();

    expect(screen.queryByRole("button", { name: "Choose a plan" })).toBeNull();
  });

  it("lists every plan, mine apart from shared, view-only ones disabled", async () => {
    renderSendToPlan({ choosable: true });

    const menu = await openPlanMenu();

    const mine = within(menu).getByRole("group", { name: "My Plans" });
    expect(within(mine).getAllByRole("menuitem")).toHaveLength(1);
    expect(
      within(mine).getByRole("menuitem", { name: "This Week" }),
    ).toBeVisible();
    const shared = within(menu).getByRole("group", { name: "Shared Plans" });
    const sharedItems = within(shared).getAllByRole("menuitem");
    expect(sharedItems).toHaveLength(2);
    const party = within(shared).getByRole("menuitem", {
      name: "Block Party",
    });
    expect(party).not.toHaveAttribute("aria-disabled");
    const pantry = within(shared).getByRole("menuitem", {
      name: "Mom's Pantry",
    });
    expect(pantry).toHaveAttribute("aria-disabled", "true");
    expect(pantry).toHaveAccessibleDescription(VIEW_ONLY_HINT);
  });

  it("sends to a chosen plan once, keeping the active plan", async () => {
    const user = userEvent.setup();
    const cache = renderSendToPlan({
      choosable: true,
      mocks: [{ request: sendTo(PARTY), result: sent }],
    });

    const menu = await openPlanMenu();
    await user.click(
      within(menu).getByRole("menuitem", { name: "Block Party" }),
    );

    expect(await screen.findByText("Added to Block Party")).toBeVisible();
    expect(storedPlanId(cache)).toBe(THIS_WEEK.id);
    expect(
      screen.getByRole("button", { name: /this week/i }),
    ).toBeInTheDocument();
  });

  it("still offers other plans when the active one is view only", async () => {
    renderSendToPlan({ stored: PANTRY, choosable: true });

    expect(
      screen.getByRole("button", { name: /mom's pantry/i }),
    ).toHaveAttribute("aria-disabled", "true");
    const toggle = screen.getByRole("button", { name: "Choose a plan" });
    expect(toggle).toBeEnabled();
    expect(toggle).not.toHaveAttribute("aria-disabled");

    const menu = await openPlanMenu();

    expect(
      within(menu).getByRole("menuitem", { name: "Block Party" }),
    ).toBeVisible();
  });
});
