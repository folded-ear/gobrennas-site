import { PlanItemStatus } from "@/__generated__/graphql";
import { DirectoryPlan } from "@/features/plan-directory";
import {
  ancestorsOf,
  buildPlanContext,
  ItemRef,
} from "@/features/plan-timeline/context";
import { TimelineBucket, TimelineItem } from "@/features/plan-timeline/model";
import { ShoppingPlanItemFragment } from "./__generated__/shoppingPlanItem.generated";

/** A plan item, as the shopping list gathers it. */
export type ShoppingPlanItem = TimelineItem & ShoppingPlanItemFragment;

/** A plan being shopped, and everything in it. */
export type ShoppingPlan = DirectoryPlan & {
  /** The plan's own children, in display order. */
  readonly rootIds: readonly string[];
  readonly items: readonly ShoppingPlanItem[];
  readonly buckets: readonly TimelineBucket[];
};

export type Unit = {
  readonly id: string;
  readonly name: string;
};

/** How much of something, in one unit, or in none. */
export type Amount = {
  readonly quantity: number;
  readonly unit: Unit | null;
};

/** One plan item behind the shopping list, and where it sits. */
export type Source = {
  readonly item: ShoppingPlanItem;
  readonly plan: DirectoryPlan;
  /** Nearest first, the plan itself left out. */
  readonly ancestors: readonly ItemRef[];
};

export type ShoppingIngredient = {
  readonly id: string;
  readonly name: string;
  readonly storeOrder: number;
};

/** One ingredient, gathered from every plan item that calls for it. */
export type ShoppingItem = {
  readonly ingredient: ShoppingIngredient;
  /** One per unit, in the order they first appear. */
  readonly amounts: readonly Amount[];
  /** Whether my one plan item gives no quantity, so I show none either. */
  readonly implicit: boolean;
  /** Every plan among my plan items, in plan order. */
  readonly plans: readonly DirectoryPlan[];
  /** All my plan items, whatever their status. */
  readonly sources: readonly Source[];
};

export type Region = {
  readonly items: readonly ShoppingItem[];
  /** Plan items with no ingredient, unaggregated. */
  readonly unresolved: readonly Source[];
};

export type ShoppingList = {
  readonly needed: Region;
  readonly acquired: Region;
};

/**
 * I gather the leaves of the given plans, in plan order, into shopping
 * items by ingredient, split between what's still needed and what's been
 * acquired. Everything under an item of nothing, or an acquired one, counts
 * as acquired.
 */
export function buildShoppingList(
  plans: readonly ShoppingPlan[],
): ShoppingList {
  const context = buildPlanContext({ plans });
  const needed: MutableRegion = { items: [], unresolved: [] };
  const acquired: MutableRegion = { items: [], unresolved: [] };
  const byIngredient = new Map<
    string,
    { ingredient: ShoppingIngredient; sources: Source[] }
  >();
  const byId = new Map(
    plans.flatMap((plan) => plan.items).map((it) => [it.id, it]),
  );
  const neededIds = new Set<string>();
  const isNeeded = (item: ShoppingPlanItem) => neededIds.has(item.id);

  for (const plan of plans) {
    const directoryPlan = {
      id: plan.id,
      name: plan.name,
      color: plan.color,
      changeable: plan.changeable,
    };
    for (const item of plan.items) {
      const ingredient = item.ingredient;
      // A leaf with a recipe for its ingredient is a section header.
      if (item.children.length > 0 || ingredient?.__typename === "Recipe") {
        continue;
      }
      const ancestors = ancestorsOf(context, item.id);
      const lineage = [item, ...ancestors.map((it) => byId.get(it.id))];
      if (lineage.every((it) => it === undefined || isWanted(it))) {
        neededIds.add(item.id);
      }
      const source: Source = {
        item,
        plan: directoryPlan,
        ancestors: [...ancestors].reverse(),
      };
      if (ingredient === null) {
        (isNeeded(item) ? needed : acquired).unresolved.push(source);
        continue;
      }
      const group = byIngredient.get(ingredient.id);
      if (group === undefined) {
        const { id, name, storeOrder } = ingredient;
        byIngredient.set(id, {
          ingredient: { id, name, storeOrder },
          sources: [source],
        });
      } else {
        group.sources.push(source);
      }
    }
  }

  for (const { ingredient, sources } of byIngredient.values()) {
    const anyNeeded = sources.some((it) => isNeeded(it.item));
    (anyNeeded ? needed : acquired).items.push({
      ingredient,
      amounts: sumByUnit(
        anyNeeded ? sources.filter((it) => isNeeded(it.item)) : sources,
      ),
      implicit: sources.length === 1 && sources[0].item.quantity === null,
      plans: [...new Map(sources.map((it) => [it.plan.id, it.plan])).values()],
      sources,
    });
  }
  needed.items.sort(byStoreOrder);
  acquired.items.sort(byStoreOrder);
  return { needed, acquired };
}

/** I write an amount out: its quantity, then its unit, if it has one. */
export function formatAmount({ quantity, unit }: Amount): string {
  const rounded = String(Math.round(quantity * 100) / 100);
  return unit === null ? rounded : `${rounded} ${unit.name}`;
}

type MutableRegion = {
  readonly items: ShoppingItem[];
  readonly unresolved: Source[];
};

/**
 * I tell whether an item is still wanted on its own account. A plan item of
 * nothing is as good as acquired.
 */
function isWanted(item: ShoppingPlanItem): boolean {
  return item.status === PlanItemStatus.NEEDED && item.quantity?.quantity !== 0;
}

function sumByUnit(sources: readonly Source[]): Amount[] {
  const byUnit = new Map<
    string | null,
    { quantity: number; unit: Unit | null }
  >();
  for (const { item } of sources) {
    const quantity = item.quantity?.quantity ?? 1;
    if (quantity === 0) continue;
    const units = item.quantity?.units ?? null;
    const unit = units === null ? null : { id: units.id, name: units.name };
    const unitId = unit?.id ?? null;
    const amount = byUnit.get(unitId);
    if (amount === undefined) byUnit.set(unitId, { quantity, unit });
    else amount.quantity += quantity;
  }
  return [...byUnit.values()];
}

function byStoreOrder(a: ShoppingItem, b: ShoppingItem): number {
  return (
    a.ingredient.storeOrder - b.ingredient.storeOrder ||
    a.ingredient.name.localeCompare(b.ingredient.name)
  );
}
