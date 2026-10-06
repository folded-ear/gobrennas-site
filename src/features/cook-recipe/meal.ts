import { PlanItemStatus } from "@/__generated__/graphql";
import { isNamedBucket } from "@/features/plan-dnd/moves";
import { bucketLabel } from "@/features/plan-timeline/section-label";
import { planItemParts } from "@/lib/ingredient-parts";
import type { CookPlanFragment } from "./__generated__/cookPlan.generated";
import { cookReader, type CookItem, type CookRecipeContent } from "./model";

export type CookBucket = CookPlanFragment["buckets"][number];

/** One plan's share of what a meal is gathered from. */
export type MealPlan = {
  /** The plan's own children, in plan order. */
  readonly rootIds: readonly string[];
  readonly items: readonly CookItem[];
  readonly buckets: readonly CookBucket[];
};

/** Several buckets' items, cooked together as one meal. */
export type CookMeal = {
  readonly label: string;
  /** The items the buckets hold directly, rather than through another. */
  readonly courseIds: ReadonlySet<string>;
  readonly recipe: CookRecipeContent;
};

/**
 * I gather what the given buckets hold, across plans, into one meal: each
 * item a bucket holds that isn't already below another, and everything
 * below those. A meal holding nothing is no meal.
 */
export function buildCookMeal(
  plans: readonly MealPlan[],
  bucketIds: readonly string[],
): CookMeal | undefined {
  const inMeal = new Set(bucketIds);
  const items = plans.flatMap((plan) => plan.items);
  const reader = cookReader(items);
  const courses: CookItem[] = [];
  const visited = new Set<string>();

  // Whatever sits below a course comes with it, so the walk stops there.
  function visit(id: string): void {
    const item = reader.byId.get(id);
    if (!item || visited.has(id) || item.status === PlanItemStatus.DELETED) {
      return;
    }
    visited.add(id);
    if (item.bucket !== null && inMeal.has(item.bucket.id)) {
      courses.push(item);
      return;
    }
    for (const child of item.children) visit(child.id);
  }

  for (const id of plans.flatMap((plan) => plan.rootIds)) visit(id);
  if (courses.length === 0) return undefined;

  const label = mealLabel(
    plans.flatMap((plan) => plan.buckets),
    bucketIds,
  );
  return {
    label,
    courseIds: new Set(courses.map((course) => course.id)),
    recipe: {
      main: {
        title: label,
        ingredients: courses.map(planItemParts),
        directions: null,
      },
      sections: reader.sectionsFrom(courses),
    },
  };
}

/** I label a meal as its buckets' section is: the first one's name, and their date. */
function mealLabel(
  buckets: readonly CookBucket[],
  bucketIds: readonly string[],
): string {
  const byId = new Map(buckets.map((bucket) => [bucket.id, bucket]));
  const inMeal = bucketIds.flatMap((id) => byId.get(id) ?? []);
  const named = inMeal.find(isNamedBucket);
  return bucketLabel(named?.name ?? null, inMeal[0]?.date ?? null);
}
