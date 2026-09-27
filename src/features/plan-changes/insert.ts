import { ApolloCache, Reference } from "@apollo/client";

export type CreatedPlace = {
  readonly id: string;
  readonly parentId: string;
  /** The sibling I follow, or null when I'm first. */
  readonly afterId: string | null;
  readonly planId: string;
};

// Plans are keyed as PlanItems too (build-in-memory-cache.ts), so this
// finds a parent whichever it is.
function itemCacheId(cache: ApolloCache, id: string): string | undefined {
  return cache.identify({ __typename: "PlanItem", id });
}

/**
 * I put a created item, already written to the cache, where its parent's
 * children and its plan's descendants list it. Lists nothing has read are
 * left alone.
 */
export function insertCreated(
  cache: ApolloCache,
  { id, parentId, afterId, planId }: CreatedPlace,
): void {
  const ref = { __ref: itemCacheId(cache, id)! } satisfies Reference;
  cache.modify<{ children: readonly Reference[] }>({
    id: itemCacheId(cache, parentId),
    fields: {
      children: (existing, { readField }) => {
        const at =
          afterId === null
            ? 0
            : existing.findIndex((it) => readField("id", it) === afterId) + 1;
        return [...existing.slice(0, at), ref, ...existing.slice(at)];
      },
    },
  });
  cache.modify<{ descendants: readonly Reference[] }>({
    id: itemCacheId(cache, planId),
    fields: {
      descendants: (existing) => [...existing, ref],
    },
  });
}
