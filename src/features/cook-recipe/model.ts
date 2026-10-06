import { PlanItemStatus } from "@/__generated__/graphql";
import { planItemParts, type IngredientParts } from "@/lib/ingredient-parts";
import { displayName } from "@/lib/plan-item-name";
import type { CookPlanFragment } from "./__generated__/cookPlan.generated";

export type CookItem = Extract<
  CookPlanFragment["updatedSince"][number],
  { __typename: "PlanItem" }
>;

export type CookSection = {
  item: CookItem;
  title: string;
  ingredients: IngredientParts[];
  directions: string | null;
};

/** I give the plan items that belong to the plan itself. */
export function cookItemsOf(
  plan: Pick<CookPlanFragment, "id" | "updatedSince">,
): CookItem[] {
  return plan.updatedSince
    .filter((item) => item.__typename === "PlanItem")
    .filter((item) => item.plan.id === plan.id);
}

/** What Cook shows: what heads it, then each section below. */
export type CookRecipeContent = {
  /** Lacks an item when no one item heads the content. */
  main: Omit<CookSection, "item"> & { item?: CookItem };
  sections: CookSection[];
};

/** I read the cooking relationships among some items. */
export function cookReader(items: readonly CookItem[]) {
  const byId = new Map(items.map((item) => [item.id, item]));

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
      title: displayName(item.name),
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
        .map(planItemParts),
    };
  }

  /** I give a section for each start worth one, and each below it, depth first. */
  function sectionsFrom(
    starts: readonly CookItem[],
    seen: ReadonlySet<string> = new Set(),
  ): CookSection[] {
    const sections: CookSection[] = [];
    const visited = new Set(seen);
    const pending = [...starts].reverse();
    while (pending.length > 0) {
      const item = pending.pop();
      if (!item || visited.has(item.id)) continue;
      visited.add(item.id);
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
    return sections;
  }

  return { byId, children, content, sectionsFrom };
}

/** Read the cooking relationships, which can differ from the scheduling tree. */
export function buildCookRecipe(items: readonly CookItem[], itemId: string) {
  const reader = cookReader(items);
  const root = reader.byId.get(itemId);
  if (!root || root.status === PlanItemStatus.DELETED) return undefined;
  return {
    main: reader.content(root),
    sections: reader.sectionsFrom(reader.children(root), new Set([root.id])),
  };
}
