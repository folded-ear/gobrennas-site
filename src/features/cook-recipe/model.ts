import { PlanItemStatus } from "@/__generated__/graphql";
import type { RecipeIngredient } from "@/features/recipe-ingredients-and-directions/content";
import { displayName } from "@/lib/plan-item-name";
import type { CookPlanFragment } from "./__generated__/cookPlan.generated";

export type CookItem = Extract<
  CookPlanFragment["updatedSince"][number],
  { __typename: "PlanItem" }
>;

export type CookSection = {
  item: CookItem;
  title: string;
  ingredients: RecipeIngredient[];
  directions: string | null;
};

/** Read the cooking relationships, which can differ from the scheduling tree. */
export function buildCookRecipe(items: readonly CookItem[], itemId: string) {
  const byId = new Map(items.map((item) => [item.id, item]));
  const root = byId.get(itemId);
  if (!root || root.status === PlanItemStatus.DELETED) return undefined;

  function children(item: CookItem) {
    const ids = new Set(
      [...item.children, ...item.components].map(({ id }) => id),
    );
    return [...ids].flatMap((id) => {
      const child = byId.get(id);
      return child && child.status !== PlanItemStatus.DELETED ? [child] : [];
    });
  }

  function content(item: CookItem): CookSection {
    const recipe =
      item.ingredient?.__typename === "Recipe" ? item.ingredient : undefined;
    const sectionIds = new Set(recipe?.sections.map(({ id }) => id));
    return {
      item,
      title: displayName(item.pendingName ?? item.name),
      directions: item.notes?.trim()
        ? item.notes
        : (recipe?.directions ?? null),
      ingredients: children(item)
        .filter(
          (child) =>
            !(
              child.quantity === null &&
              child.ingredient &&
              sectionIds.has(child.ingredient.id)
            ),
        )
        .map((child): RecipeIngredient => {
          if (child.pendingName !== null || !child.ingredient)
            return { text: displayName(child.pendingName ?? child.name) };
          return {
            text: displayName(child.name),
            quantity: child.quantity?.quantity,
            unit: child.quantity?.units?.name,
            name:
              child.ingredient.__typename === "Recipe"
                ? displayName(child.name)
                : child.ingredient.name,
            preparation: child.preparation ?? undefined,
          };
        }),
    };
  }

  const main = content(root);
  const sections: CookSection[] = [];
  const seen = new Set([root.id]);
  const pending = children(root).reverse();
  while (pending.length > 0) {
    const item = pending.pop();
    if (!item || seen.has(item.id)) continue;
    seen.add(item.id);
    const nested = children(item);
    if (
      nested.length > 0 ||
      item.ingredient?.__typename === "Recipe" ||
      item.notes?.trim()
    ) {
      sections.push(content(item));
      pending.push(...nested.reverse());
    }
  }
  return { main, sections };
}
