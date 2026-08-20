import { buildInMemoryCache } from "@/lib/apollo/build-in-memory-cache";
import { MockedProvider, MockedProviderProps } from "@apollo/client/testing/react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { DoSendToPlanDocument } from "./__generated__/doSendToPlan.generated";
import { SendToPlanFragmentDoc } from "./__generated__/sendToPlan.generated";
import { SendToPlan } from "./index";

const activePlanId = "plan-1";
const recipeId = "recipe-1";

function renderSendToPlan(mocks: MockedProviderProps["mocks"] = []) {
  const cache = buildInMemoryCache();
  // SendToPlan reads its fragment from ROOT_QUERY rather than a prop,
  // mirroring how the planner screen's query would have already populated
  // the cache. Seed it directly via the same fragment doc.
  cache.writeFragment({
    id: "ROOT_QUERY",
    fragment: SendToPlanFragmentDoc,
    fragmentName: "sendToPlan",
    variables: { activePlanId },
    data: {
      planner: {
        __typename: "PlannerQuery",
        plan: { __typename: "Plan", id: activePlanId, name: "This Week" },
      },
    },
  });

  return render(
    <MockedProvider cache={cache} mocks={mocks}>
      <SendToPlan recipeId={recipeId} activePlanId={activePlanId} />
    </MockedProvider>,
  );
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

    renderSendToPlan([
      {
        request: {
          query: DoSendToPlanDocument,
          variables: { recipeId, planId: activePlanId },
        },
        result: {
          data: {
            library: {
              __typename: "LibraryMutation",
              sendRecipeToPlan: { __typename: "PlanItem", id: "item-1" },
            },
          },
        },
      },
    ]);

    await user.click(screen.getByRole("button", { name: /this week/i }));

    expect(
      screen.getByRole("button", { name: /sending/i }),
    ).toBeInTheDocument();

    expect(
      await screen.findByRole("button", { name: /this week/i }),
    ).toBeInTheDocument();
  });
});
