import { ApolloCache } from "@apollo/client";
import { PlanItemChildrenFragmentDoc } from "./__generated__/planItemChildren.generated";
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
    fragment: PlanItemChildrenFragmentDoc,
    id: cacheId,
  });
  for (const child of item?.children ?? []) evictItem(cache, child.id);
  evictRecipeHistory(cache, cacheId);
  cache.evict({ id: cacheId });
}

function evictRecipeHistory(cache: ApolloCache, itemCacheId?: string) {
  const ingredient = cache.readFragment({
    fragment: PlanItemIngredientFragmentDoc,
    id: itemCacheId,
  })?.ingredient;
  if (ingredient?.__typename !== "Recipe") return;
  const recipeCacheId = cache.identify(ingredient);
  for (const fieldName of HISTORY_FIELDS)
    cache.evict({ id: recipeCacheId, fieldName });
}
