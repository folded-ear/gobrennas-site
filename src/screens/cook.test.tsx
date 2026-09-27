import { PlanItemStatus } from "@/__generated__/graphql";
import { CookDocument } from "@/screens/__generated__/cook.generated";
import { act, buildInMemoryCache, render, screen, userEvent } from "@/test";
import { Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Cook } from "./cook";

const back = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back }),
}));

beforeEach(() => {
  back.mockReset();
});

async function renderCook({ mine = true } = {}) {
  // The screen suspends until its query answers.
  await act(async () => {
    render(
      <Suspense>
        <Cook planId="7" itemId="1" />
      </Suspense>,
      {
        cache: buildInMemoryCache(),
        mocks: [
          {
            request: {
              query: CookDocument,
              variables: { planId: "7", itemId: "1" },
            },
            result: {
              data: {
                planner: {
                  __typename: "PlannerQuery",
                  plan: {
                    __typename: "Plan",
                    id: "7",
                    mine,
                    grants: [],
                  },
                  planItem: {
                    __typename: "PlanItem",
                    id: "1",
                    name: "Pumpkin pie",
                    status: PlanItemStatus.NEEDED,
                    notes: null,
                    parent: { __typename: "Plan", id: "7" },
                    aggregate: null,
                    preparation: null,
                    ingredient: null,
                    quantity: null,
                    components: [],
                    bucket: null,
                  },
                },
              },
            },
          },
        ],
      },
    );
  });
}

describe("Cook", () => {
  it("offers to acquire the item", async () => {
    await renderCook();

    expect(
      await screen.findByRole("button", { name: "Mark acquired: Pumpkin pie" }),
    ).toBeVisible();
  });

  it("goes back once the item is cooked, its undo waiting on the plan", async () => {
    await renderCook();

    await userEvent.click(
      await screen.findByRole("button", { name: "I cooked it: Pumpkin pie" }),
    );

    expect(back).toHaveBeenCalledOnce();
  });

  it("offers nothing but the status to someone who can't change the plan", async () => {
    await renderCook({ mine: false });

    expect(await screen.findByRole("img", { name: "Needed" })).toBeVisible();
    expect(screen.queryByRole("button", { name: /^I cooked it/ })).toBeNull();
  });
});
