import { displayName } from "@/lib/plan-item-name";

/** I'm an ingredient line's saved parts, or its wording alone without them. */
export type IngredientParts = {
  text: string;
  quantity?: number;
  unit?: string;
  name?: string;
  preparation?: string;
};

type PlanItemSource = {
  readonly name: string;
  readonly preparation: string | null;
  readonly quantity: {
    readonly quantity: number;
    readonly units: { readonly name: string } | null;
  } | null;
  readonly ingredient: {
    readonly __typename: string;
    readonly name: string;
  } | null;
};

/**
 * I give a plan item's saved parts, a recipe called for by the item's own
 * name, or the item's name alone when it has no ingredient.
 */
export function planItemParts(item: PlanItemSource): IngredientParts {
  const text = displayName(item.name);
  if (!item.ingredient) return { text };
  return {
    text,
    quantity: item.quantity?.quantity,
    unit: item.quantity?.units?.name,
    name: item.ingredient.__typename === "Recipe" ? text : item.ingredient.name,
    preparation: item.preparation ?? undefined,
  };
}
