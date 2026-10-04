import { ApolloCache } from "@apollo/client";
import { PlanItemChildrenFragmentDoc } from "./__generated__/planItemChildren.generated";

/**
 * I remove an item and everything below it from the cache. Apollo drops
 * the dangling references this leaves in lists, so no list is edited.
 */
export function evictItem(cache: ApolloCache, id: string): void {
  const cacheId = cache.identify({ __typename: "PlanItem", id });
  const item = cache.readFragment({
    fragment: PlanItemChildrenFragmentDoc,
    id: cacheId,
  });
  for (const child of item?.children ?? []) evictItem(cache, child.id);
  cache.evict({ id: cacheId });
}
