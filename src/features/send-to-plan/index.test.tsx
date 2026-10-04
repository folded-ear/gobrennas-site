import { FAILURE_TOAST_TITLE } from "@/lib/apollo/failure-toast-link";
import {
  buildInMemoryCache,
  render,
  screen,
  seedFragment,
  userEvent,
  waitFor,
} from "@/test";
import { MockedProviderProps } from "@apollo/client/testing/react";
import { describe, expect, it, vi } from "vitest";
import { DoSendToPlanDocument } from "./__generated__/doSendToPlan.generated";
import { SendToPlanFragmentDoc } from "./__generated__/sendToPlan.generated";
import { SendToPlan } from "./index";

const activePlanId = "plan-1";
const recipeId = "recipe-1";
const sentItemId = "item-1";
const sentItemKey = `PlanItem:${sentItemId}`;
const request = {
  query: DoSendToPlanDocument,
  variables: { recipeId, planId: activePlanId },
};
const sent = {
  data: {
    library: {
      __typename: "LibraryMutation" as const,
      sendRecipeToPlan: { __typename: "PlanItem" as const, id: sentItemId },
    },
  },
};

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

  it("sends the recipe to the plan and says so", async () => {
    const user = userEvent.setup();
    const send = vi.fn(() => sent);
    const cache = renderSendToPlan([{ request, result: send, delay: 100 }]);

    expect(cache.extract()[sentItemKey]).toBeUndefined();

    const button = screen.getByRole("button", { name: /this week/i });
    await user.click(button);
    await user.click(button);

    expect(await screen.findByText("Added to This Week")).toBeVisible();
    expect(send).toHaveBeenCalledTimes(1);
    expect(cache.extract()[sentItemKey]).toBeDefined();
  });

  it("says so when the recipe can't be sent", async () => {
    const user = userEvent.setup();
    renderSendToPlan([{ request, error: new Error("Failed to fetch") }]);

    await user.click(screen.getByRole("button", { name: /this week/i }));

    expect(
      await screen.findByText("Couldn’t add recipe to plan"),
    ).toBeVisible();
    expect(screen.queryByText(FAILURE_TOAST_TITLE)).not.toBeInTheDocument();
  });

  it("says so when the plan doesn't take the recipe", async () => {
    const user = userEvent.setup();
    renderSendToPlan([
      { request, result: { errors: [{ message: "Plan not found" }] } },
    ]);

    await user.click(screen.getByRole("button", { name: /this week/i }));

    expect(
      await screen.findByText("Couldn’t add recipe to plan"),
    ).toBeVisible();
    expect(screen.queryByText(FAILURE_TOAST_TITLE)).not.toBeInTheDocument();
  });

  it("says so when no plan item comes back", async () => {
    const user = userEvent.setup();
    renderSendToPlan([
      {
        request,
        result: {
          data: {
            library: { __typename: "LibraryMutation", sendRecipeToPlan: null },
          },
        },
      },
    ]);

    await user.click(screen.getByRole("button", { name: /this week/i }));

    expect(
      await screen.findByText("Couldn’t add recipe to plan"),
    ).toBeVisible();
  });
});
