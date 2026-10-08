import { PlanItemStatus } from "@/__generated__/graphql";
import { DirectoryPlan } from "@/features/plan-directory";
import { PlanItemTextFragment } from "@/features/plan-item/__generated__/planItemText.generated";
import { ToggleStatus } from "@/features/plan-status";
import {
  ancestorsOf,
  buildPlanContext,
  ItemRef,
} from "@/features/plan-timeline/context";
import { TimelineBucket, TimelineItem } from "@/features/plan-timeline/model";
import { FragmentType } from "@apollo/client";
import { ShoppingPlanItemFragment } from "./__generated__/shoppingPlanItem.generated";
import { byStoreOrder } from "./store-order";

/** A plan item, as the shopping list gathers it. */
export type ShoppingPlanItem = TimelineItem &
  ShoppingPlanItemFragment &
  FragmentType<PlanItemTextFragment>;

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

/** An ancestor of a plan item behind the shopping list. */
export type SourceAncestor = ItemRef & {
  /** Whether I count as acquired, and so everything under me does. */
  readonly acquired: boolean;
};

/** One plan item behind the shopping list, and where it sits. */
export type Source = {
  readonly item: ShoppingPlanItem;
  readonly plan: DirectoryPlan;
  /** Nearest first, the plan itself left out. */
  readonly ancestors: readonly SourceAncestor[];
  /** The status I count as, whatever my item's own. */
  readonly countsAs: ToggleStatus;
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
  /** Needed while any of my plan items counts as needed. */
  readonly countsAs: ToggleStatus;
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
 * as acquired. A held row (see statusesOf) shows in the other region.
 */
export function buildShoppingList(
  plans: readonly ShoppingPlan[],
  held: ReadonlySet<string> = new Set(),
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
      const ancestors = ancestorsOf(context, item.id)
        .map((it) => {
          const found = byId.get(it.id);
          return { ...it, acquired: found !== undefined && !isWanted(found) };
        })
        .reverse();
      const source: Source = {
        item,
        plan: directoryPlan,
        ancestors,
        countsAs:
          isWanted(item) && ancestors.every((it) => !it.acquired)
            ? PlanItemStatus.NEEDED
            : PlanItemStatus.ACQUIRED,
      };
      if (ingredient === null) {
        const showsNeeded = isNeeded(source) !== held.has(item.id);
        (showsNeeded ? needed : acquired).unresolved.push(source);
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
    const anyNeeded = sources.some(isNeeded);
    const showsNeeded = anyNeeded !== held.has(ingredientKey(ingredient.id));
    (showsNeeded ? needed : acquired).items.push({
      ingredient,
      amounts: sumByUnit(anyNeeded ? sources.filter(isNeeded) : sources),
      implicit: sources.length === 1 && sources[0].item.quantity === null,
      plans: [...new Map(sources.map((it) => [it.plan.id, it.plan])).values()],
      sources,
      countsAs: anyNeeded ? PlanItemStatus.NEEDED : PlanItemStatus.ACQUIRED,
    });
  }
  needed.items.sort(byIngredientStoreOrder);
  acquired.items.sort(byIngredientStoreOrder);
  return { needed, acquired };
}

const INGREDIENT_KEY_PREFIX = "ingredient:";

/** I key a shopping item's row, apart from any plan item's. */
export function ingredientKey(ingredientId: string): string {
  return `${INGREDIENT_KEY_PREFIX}${ingredientId}`;
}

/**
 * I give the status of every row, keyed as held rows are: a shopping item's
 * by its ingredient, a loose plan item's by its id.
 */
export function statusesOf(
  list: ShoppingList,
): ReadonlyMap<string, ToggleStatus> {
  const statuses = new Map<string, ToggleStatus>();
  for (const region of [list.needed, list.acquired]) {
    for (const item of region.items) {
      statuses.set(ingredientKey(item.ingredient.id), item.countsAs);
    }
    for (const source of region.unresolved) {
      statuses.set(source.item.id, source.countsAs);
    }
  }
  return statuses;
}

/**
 * I give the held rows once statuses change: a row whose status flipped
 * goes in if it wasn't held, and out if it was. A row that's gone goes out.
 */
export function toggleFlips(
  held: ReadonlySet<string>,
  before: ReadonlyMap<string, ToggleStatus>,
  after: ReadonlyMap<string, ToggleStatus>,
): ReadonlySet<string> {
  const next = new Set<string>();
  for (const [key, status] of after) {
    const was = before.get(key);
    const flipped = was !== undefined && was !== status;
    if (held.has(key) !== flipped) next.add(key);
  }
  return next;
}

type MutableRegion = {
  readonly items: ShoppingItem[];
  readonly unresolved: Source[];
};

function isNeeded(source: Source): boolean {
  return source.countsAs === PlanItemStatus.NEEDED;
}

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

function byIngredientStoreOrder(a: ShoppingItem, b: ShoppingItem): number {
  return byStoreOrder(a.ingredient, b.ingredient);
}
