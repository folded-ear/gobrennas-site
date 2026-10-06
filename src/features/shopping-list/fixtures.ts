import { PlanItemStatus } from "@/__generated__/graphql";
import {
  PlanItemFragment,
  PlanItemFragmentDoc,
} from "@/features/plan-item/__generated__/planItem.generated";
import { PlanItemTextFragmentDoc } from "@/features/plan-item/__generated__/planItemText.generated";
import { buildInMemoryCache, seedFragment } from "@/test";
import { ShoppingPlan, ShoppingPlanItem, Unit } from "./model";

type Cache = ReturnType<typeof buildInMemoryCache>;

export const TSP: Unit = { id: "u3", name: "tsp" };
export const TBSP: Unit = { id: "u2", name: "Tbsp" };

export const SUGAR = { id: "p2", name: "sugar", storeOrder: 10 };
export const BASIL = { id: "p3", name: "basil", storeOrder: 30 };

type ItemSpec = {
  readonly id: string;
  readonly name: string;
  readonly parent: string;
  readonly children?: readonly string[];
  readonly status?: PlanItemStatus;
  readonly quantity?: number | null;
  readonly unit?: Unit | null;
  readonly pantry?: typeof SUGAR;
};

/**
 * I seed a plan item into the cache, for the components that read it, and
 * give it back as the shopping list gathers it.
 */
export function seedItem(
  cache: Cache,
  {
    id,
    name,
    parent,
    children = [],
    status = PlanItemStatus.NEEDED,
    quantity = null,
    unit = null,
    pantry,
  }: ItemSpec,
): ShoppingPlanItem {
  const units =
    unit === null ? null : { __typename: "UnitOfMeasure" as const, ...unit };
  const data: PlanItemFragment = {
    __typename: "PlanItem",
    id,
    name,
    status,
    notes: null,
    preparation: null,
    parent: { __typename: "PlanItem", id: parent },
    aggregate: null,
    ingredient: pantry ? { __typename: "PantryItem", id: pantry.id } : null,
    quantity:
      quantity === null ? null : { __typename: "Quantity", quantity, units },
    components: [],
    bucket: null,
  };
  const ref = seedFragment(cache, PlanItemFragmentDoc, "planItem", data);
  const text = seedFragment(cache, PlanItemTextFragmentDoc, "planItemText", {
    __typename: "PlanItem",
    id,
    name,
    preparation: data.preparation,
    quantity: data.quantity,
    ingredient: pantry ? { __typename: "PantryItem", ...pantry } : null,
  });
  return {
    // Both seeds name the same cached item, which carries both fragments.
    ...(ref as typeof ref & typeof text),
    __typename: "PlanItem",
    id,
    name,
    bucket: null,
    children: children.map((childId) => ({
      __typename: "PlanItem",
      id: childId,
    })),
    status,
    quantity: data.quantity,
    ingredient: pantry ? { __typename: "PantryItem", ...pantry } : null,
  };
}

export function plan(
  id: string,
  name: string,
  color: string,
  rootIds: readonly string[],
  items: readonly ShoppingPlanItem[],
): ShoppingPlan {
  return { id, name, color, changeable: true, rootIds, items, buckets: [] };
}
