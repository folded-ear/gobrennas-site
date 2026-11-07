import { PlanItemStatus } from "@/__generated__/graphql";
import { changeMutation } from "@/features/page-engine/mutation";
import {
  PlanDirectoryProvider,
  type DirectoryPlan,
} from "@/features/plan-directory";
import {
  buildInMemoryCache,
  render,
  screen,
  seedFragment,
  userEvent,
} from "@/test";
import { describe, expect, it } from "vitest";
import {
  PlanItemFragmentDoc,
  type PlanItemFragment,
} from "./__generated__/planItem.generated";
import { PlanRecipeScale } from "./recipe-scale";

const plan: DirectoryPlan = {
  id: "week",
  name: "This week",
  color: "#123456",
  changeable: true,
};
const root: PlanItemFragment = {
  __typename: "PlanItem",
  id: "chili",
  name: "Edited chili",
  status: PlanItemStatus.NEEDED,
  notes: null,
  preparation: null,
  aggregate: null,
  parent: { __typename: "Plan", id: plan.id },
  ingredient: { __typename: "Recipe", id: "saved-chili", sectionOf: null },
  quantity: { __typename: "Quantity", quantity: 2, units: null },
  children: [{ __typename: "PlanItem", id: "beans" }],
  components: [{ __typename: "PlanItem", id: "beans" }],
  bucket: null,
};
const beans: PlanItemFragment = {
  ...root,
  id: "beans",
  name: "5 beans, rinsed",
  preparation: "rinsed",
  parent: { __typename: "PlanItem", id: root.id },
  aggregate: { __typename: "PlanItem", id: root.id },
  ingredient: { __typename: "PantryItem", id: "pantry-beans" },
  quantity: { __typename: "Quantity", quantity: 5, units: null },
  children: [],
  components: [],
};

function show(changeable = true) {
  const cache = buildInMemoryCache();
  seedFragment(cache, PlanItemFragmentDoc, "planItem", root);
  seedFragment(cache, PlanItemFragmentDoc, "planItem", beans);
  const editable = { ...plan, changeable };
  const { mutation, variables } = changeMutation([
    {
      kind: "scaleRecipe",
      id: root.id,
      planId: plan.id,
      name: root.name,
      scale: 1,
      quantities: { chili: 1, beans: 2.5 },
      names: { beans: "2.5 beans, rinsed" },
    },
  ]);
  render(
    <PlanDirectoryProvider
      directory={{
        plans: [editable],
        planOfItem: new Map([
          [root.id, editable],
          [beans.id, editable],
        ]),
        planOfBucket: new Map(),
      }}
    >
      <PlanRecipeScale itemId={root.id} />
    </PlanDirectoryProvider>,
    {
      cache,
      mocks: [
        {
          request: { query: mutation, variables },
          result: {
            data: { planner: { s0: { __typename: "PlanItem", id: root.id } } },
          },
        },
      ],
    },
  );
  return cache;
}

describe("PlanRecipeScale", () => {
  it("shows the saved multiplier and scales edited shopping quantities immediately", async () => {
    const cache = show();
    expect(screen.getByRole("button", { name: "2×" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await userEvent.click(screen.getByRole("button", { name: "1×" }));
    const shown = cache.readFragment({
      fragment: PlanItemFragmentDoc,
      id: "PlanItem:beans",
    });
    expect(shown?.quantity?.quantity).toBe(2.5);
    expect(shown?.name).toBe("2.5 beans, rinsed");
    expect(shown?.preparation).toBe("rinsed");
    expect(shown?.ingredient?.id).toBe("pantry-beans");
    expect(screen.getByText(/shopping list/)).toBeVisible();
  });
  it("does not offer persisted scaling to viewers", () => {
    show(false);
    expect(
      screen.queryByRole("group", { name: "Recipe scale" }),
    ).not.toBeInTheDocument();
  });
});
