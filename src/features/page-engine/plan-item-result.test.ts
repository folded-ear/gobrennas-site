import { PlannerQuery } from "@/screens/__generated__/planner.generated";
import { ShoppingQuery } from "@/screens/__generated__/shopping.generated";
import { describe, expectTypeOf, it } from "vitest";
import { PlanItemResultFragment } from "./__generated__/planItemResult.generated";

type PlannerItem =
  PlannerQuery["planner"]["plans"][number]["descendants"][number];
type ShoppingItem =
  ShoppingQuery["planner"]["plans"][number]["descendants"][number];

// Nothing ties a query's spreads to a mutation's, so these fail tsc when
// a query reads more of an item than a created or renamed one carries.
describe("planItemResult", () => {
  it("carries everything the planner reads of an item", () => {
    expectTypeOf<PlanItemResultFragment>().toExtend<PlannerItem>();
  });

  it("carries everything the shopping list reads of an item", () => {
    expectTypeOf<PlanItemResultFragment>().toExtend<ShoppingItem>();
  });
});
