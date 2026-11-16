import { ApolloCache } from "@apollo/client";
import { CorePlanItemChildrenFragmentDoc } from "./__generated__/corePlanItemChildren.generated";
import { PlanItemIngredientFragmentDoc } from "./__generated__/planItemIngredient.generated";

const HISTORY_FIELDS = ["plannedHistory", "plannedCount"];

/**
 * I remove an item and everything below it from the cache, along with the
 * cached history of each recipe among them. Apollo drops the dangling
 * references this leaves in lists, so no list is edited.
 */
export function evictItem(cache: ApolloCache, id: string): void {
  const cacheId = cache.identify({ __typename: "PlanItem", id });
  const item = cache.readFragment({
    fragment: CorePlanItemChildrenFragmentDoc,
    id: cacheId,
  });
  for (const child of item?.children ?? []) evictItem(cache, child.id);
  evictItemRecipeHistory(cache, cacheId);
  cache.evict({ id: cacheId });
}

function evictItemRecipeHistory(cache: ApolloCache, itemCacheId?: string) {
  const ingredient = cache.readFragment({
    fragment: PlanItemIngredientFragmentDoc,
    id: itemCacheId,
  })?.ingredient;
  if (ingredient?.__typename !== "Recipe") return;
  evictRecipeHistory(cache, ingredient.id);
}

/** I evict a recipe's cached history. */
export function evictRecipeHistory(cache: ApolloCache, recipeId: string): void {
  const recipeCacheId = cache.identify({ __typename: "Recipe", id: recipeId });
  for (const fieldName of HISTORY_FIELDS)
    cache.evict({ id: recipeCacheId, fieldName });
}
