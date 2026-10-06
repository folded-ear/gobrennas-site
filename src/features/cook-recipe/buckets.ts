import { PlanItemStatus } from "@/__generated__/graphql";
import { isNamedBucket } from "@/features/plan-dnd/moves";
import { bucketLabel } from "@/features/plan-timeline/section-label";
import { planItemParts } from "@/lib/ingredient-parts";
import type { CookPlanFragment } from "./__generated__/cookPlan.generated";
import { cookReader, type CookItem, type CookRecipeContent } from "./model";

export type CookPlanBucket = CookPlanFragment["buckets"][number];

/** One plan's share of what some buckets are gathered from. */
export type CookBucketsPlan = {
  /** The plan's own children, in plan order. */
  readonly childIds: readonly string[];
  readonly items: readonly CookItem[];
  readonly buckets: readonly CookPlanBucket[];
};

/** Several buckets' items, cooked together as one. */
export type CookBuckets = {
  readonly label: string;
  /** The items the buckets hold directly, rather than through another. */
  readonly rootIds: ReadonlySet<string>;
  readonly recipe: CookRecipeContent;
};

/**
 * I gather what the given buckets hold, across plans, to cook as one: each
 * item a bucket holds that isn't already below another, and everything
 * below those. Buckets holding nothing give nothing.
 */
export function buildCookBuckets(
  plans: readonly CookBucketsPlan[],
  bucketIds: readonly string[],
): CookBuckets | undefined {
  const wanted = new Set(bucketIds);
  const items = plans.flatMap((plan) => plan.items);
  const reader = cookReader(items);
  const roots: CookItem[] = [];
  const visited = new Set<string>();

  // Whatever sits below a root comes with it, so the walk stops there.
  function visit(id: string): void {
    const item = reader.byId.get(id);
    if (!item || visited.has(id) || item.status === PlanItemStatus.DELETED) {
      return;
    }
    visited.add(id);
    if (item.bucket !== null && wanted.has(item.bucket.id)) {
      roots.push(item);
      return;
    }
    for (const child of item.children) visit(child.id);
  }

  for (const id of plans.flatMap((plan) => plan.childIds)) visit(id);
  if (roots.length === 0) return undefined;

  const label = bucketsLabel(
    plans.flatMap((plan) => plan.buckets),
    bucketIds,
  );
  return {
    label,
    rootIds: new Set(roots.map((root) => root.id)),
    recipe: {
      main: {
        title: label,
        ingredients: roots.map(planItemParts),
        directions: null,
      },
      sections: reader.sectionsFrom(roots),
    },
  };
}

/** I label buckets as their section is: the first one's name, and their date. */
function bucketsLabel(
  buckets: readonly CookPlanBucket[],
  bucketIds: readonly string[],
): string {
  const byId = new Map(buckets.map((bucket) => [bucket.id, bucket]));
  const wanted = bucketIds.flatMap((id) => byId.get(id) ?? []);
  const named = wanted.find(isNamedBucket);
  return bucketLabel(named?.name ?? null, wanted[0]?.date ?? null);
}
