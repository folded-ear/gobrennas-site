import {
  buildInMemoryCache,
  render,
  screen,
  seedFragment,
  userEvent,
  waitFor,
} from "@/test";
import { MockedProviderProps } from "@apollo/client/testing/react";
import { describe, expect, it } from "vitest";
import { DoSendToPlanDocument } from "./__generated__/doSendToPlan.generated";
import { SendToPlanFragmentDoc } from "./__generated__/sendToPlan.generated";
import { SendToPlan } from "./index";

const activePlanId = "plan-1";
const recipeId = "recipe-1";
const sentItemId = "item-1";
const sentItemKey = `PlanItem:${sentItemId}`;

function renderSendToPlan(mocks: MockedProviderProps["mocks"] = []) {
  const cache = buildInMemoryCache();
  // SendToPlan reads its fragment from ROOT_QUERY rather than a prop,
  // mirroring how the planner screen's query would have already populated
  // the cache.
  seedFragment(
    cache,
    SendToPlanFragmentDoc,
    "sendToPlan",
    {
      planner: {
        __typename: "PlannerQuery",
        plan: { __typename: "Plan", id: activePlanId, name: "This Week" },
      },
    },
    { id: "ROOT_QUERY", variables: { activePlanId } },
  );

  render(<SendToPlan recipeId={recipeId} activePlanId={activePlanId} />, {
    cache,
    mocks,
  });
  return cache;
}

describe("SendToPlan", () => {
  it("shows the active plan's name", () => {
    renderSendToPlan();

    expect(
      screen.getByRole("button", { name: /this week/i }),
    ).toBeInTheDocument();
  });

  it("sends the recipe to the plan when clicked", async () => {
    const user = userEvent.setup();

    const cache = renderSendToPlan([
      {
        request: {
          query: DoSendToPlanDocument,
          variables: { recipeId, planId: activePlanId },
        },
        result: {
          data: {
            library: {
              __typename: "LibraryMutation",
              sendRecipeToPlan: { __typename: "PlanItem", id: sentItemId },
            },
          },
        },
      },
    ]);

    expect(cache.extract()[sentItemKey]).toBeUndefined();

    await user.click(screen.getByRole("button", { name: /this week/i }));

    // The button reads the same before and after, so the item the plan
    // gained is the only sign the recipe went anywhere.
    await waitFor(() => expect(cache.extract()[sentItemKey]).toBeDefined());
  });
});
