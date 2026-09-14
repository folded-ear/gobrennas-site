import { ApolloCache, Reference } from "@apollo/client";
import { useApolloClient, useMutation } from "@apollo/client/react";
import { toast } from "@heroui/react";
import { useCallback, useState } from "react";
import { DoAssignBucketDocument } from "./__generated__/doAssignBucket.generated";
import { DoCreateBucketDocument } from "./__generated__/doCreateBucket.generated";
import { DoMutateTreeDocument } from "./__generated__/doMutateTree.generated";
import {
  applyTreeMove,
  bucketChangeFor,
  bucketForDate,
  BucketSummary,
  PlanTree,
  TreeMove,
} from "./moves";

type UsePlanMovesOptions = {
  planId: string;
  tree: PlanTree;
  buckets: readonly BucketSummary[];
};

/** The moves a planner can make, and which items are mid-move. */
export type PlanMoves = {
  moveInTree(move: TreeMove, name: string): void;
  moveToDate(itemId: string, date: string, name: string): void;
  moveToBucket(itemId: string, bucketId: string, name: string): void;
  moveToUnplanned(itemId: string, name: string): void;
  isMoving(itemId: string): boolean;
};

/** Keeps a stand-in bucket's id, and its optimistic layer's, off real ids. */
const STAND_IN_ID_PREFIX = "plan-dnd:";

// Plans are keyed as PlanItems too (build-in-memory-cache.ts), so this
// finds a parent whichever it is.
function itemCacheId(cache: ApolloCache, id: string): string | undefined {
  return cache.identify({ __typename: "PlanItem", id });
}

function reportFailure(name: string) {
  toast.danger(`Couldn't move ${name}`);
}

/**
 * I make moves against the server, showing each as done the moment it's
 * asked for, and undoing it if the server refuses.
 */
export function usePlanMoves({
  planId,
  tree,
  buckets,
}: UsePlanMovesOptions): PlanMoves {
  const { cache } = useApolloClient();
  const [mutateTree] = useMutation(DoMutateTreeDocument);
  const [assignBucket] = useMutation(DoAssignBucketDocument);
  const [createBucket] = useMutation(DoCreateBucketDocument);
  const [moving, setMoving] = useState<ReadonlySet<string>>(new Set());

  const track = useCallback((ids: readonly string[], work: Promise<void>) => {
    setMoving((prev) => new Set([...prev, ...ids]));
    void work.finally(() =>
      setMoving((prev) => new Set([...prev].filter((id) => !ids.includes(id)))),
    );
  }, []);

  function moveInTree(move: TreeMove, name: string) {
    const oldParentIds = new Set(
      move.ids.flatMap((id) => tree.parentOf.get(id) ?? []),
    );
    oldParentIds.delete(move.parentId);
    const children = applyTreeMove(tree, move).childrenOf.get(move.parentId);

    const work = mutateTree({
      variables: {
        spec: { ids: move.ids, parentId: move.parentId, afterId: move.afterId },
      },
      optimisticResponse: {
        planner: {
          __typename: "PlannerMutation",
          mutateTree: {
            __typename: "PlanItem",
            children: (children ?? []).map((id) => ({
              __typename: "PlanItem" as const,
              id,
            })),
          },
        },
      },
      update(c, { data }) {
        const moved = data?.planner.mutateTree.children;
        if (!moved) return;
        const parentCacheId = itemCacheId(c, move.parentId);
        c.modify<{ children: readonly Reference[] }>({
          id: parentCacheId,
          fields: {
            children: (_, { toReference }) =>
              moved.flatMap(
                (it) =>
                  toReference({ __typename: "PlanItem", id: it.id }) ?? [],
              ),
          },
        });
        // By cache id, so the parent's own typename is never rewritten.
        for (const id of move.ids) {
          c.modify<{ parent: Reference }>({
            id: itemCacheId(c, id),
            fields: {
              parent: (existing, { toReference }) =>
                (parentCacheId && toReference(parentCacheId)) || existing,
            },
          });
        }
        for (const oldParentId of oldParentIds) {
          c.modify<{ children: readonly Reference[] }>({
            id: itemCacheId(c, oldParentId),
            fields: {
              children: (existing, { readField }) =>
                existing.filter(
                  (ref) => !move.ids.includes(readField<string>("id", ref)!),
                ),
            },
          });
        }
      },
    }).then(
      () => {},
      () => reportFailure(name),
    );
    track(move.ids, work);
  }

  function assign(itemId: string, bucketId: string | null) {
    return assignBucket({
      variables: { id: itemId, bucketId },
      optimisticResponse: {
        planner: {
          __typename: "PlannerMutation",
          assignBucket: {
            __typename: "PlanItem",
            id: itemId,
            bucket:
              bucketId === null
                ? null
                : { __typename: "PlanBucket", id: bucketId },
          },
        },
      },
    });
  }

  async function assignNewBucket(itemId: string, date: string) {
    // Until the real bucket exists, a stand-in on the same date carries
    // the item there, so it never shows anywhere but where it was dropped.
    const layerId = `${STAND_IN_ID_PREFIX}${itemId}:${date}`;
    cache.recordOptimisticTransaction((c) => {
      const standIn = c.identify({
        __typename: "PlanBucket",
        id: layerId,
      });
      c.modify<{ buckets: readonly Reference[] }>({
        id: itemCacheId(c, planId),
        fields: {
          buckets: (existing, { toReference }) => [
            ...existing,
            toReference(
              { __typename: "PlanBucket", id: layerId, date, name: null },
              true,
            )!,
          ],
        },
      });
      c.modify<{ bucket: Reference | null }>({
        id: itemCacheId(c, itemId),
        fields: {
          bucket: (_, { toReference }) => toReference(standIn!) ?? null,
        },
      });
    }, layerId);
    try {
      const { data } = await createBucket({
        variables: { planId, date },
        update(c, { data }) {
          const created = data?.planner.createBucket;
          if (!created) return;
          c.modify<{ buckets: readonly Reference[] }>({
            id: itemCacheId(c, planId),
            fields: {
              buckets: (existing, { toReference }) => [
                ...existing,
                toReference(created, true)!,
              ],
            },
          });
        },
      });
      const assigned = assign(itemId, data!.planner.createBucket.id);
      // The stand-in's bucket list hides the real bucket, so it goes the
      // moment the assignment's own optimistic result has replaced it.
      cache.removeOptimistic(layerId);
      await assigned;
    } finally {
      cache.removeOptimistic(layerId);
    }
  }

  /**
   * I assign a bucket, clearing it instead when an ancestor already
   * carries the very one given, then clear it from any descendant left
   * duplicating what it would now inherit. A descendant is only cleared
   * once the item's own assignment lands, so a failed one moves nothing.
   */
  function applyBucketChange(
    itemId: string,
    newBucketId: string | null,
    name: string,
  ) {
    const { ownBucketId, redundant } = bucketChangeFor(
      tree,
      itemId,
      newBucketId,
    );
    const ids = [itemId, ...redundant];
    const work = assign(itemId, ownBucketId)
      .then(() => Promise.all(redundant.map((id) => assign(id, null))))
      .then(() => {})
      .catch(() => reportFailure(name));
    track(ids, work);
  }

  function moveToDate(itemId: string, date: string, name: string) {
    const bucketId = bucketForDate(buckets, date);
    if (bucketId === null) {
      const work = assignNewBucket(itemId, date).catch(() =>
        reportFailure(name),
      );
      track([itemId], work);
      return;
    }
    applyBucketChange(itemId, bucketId, name);
  }

  function moveToBucket(itemId: string, bucketId: string, name: string) {
    applyBucketChange(itemId, bucketId, name);
  }

  function moveToUnplanned(itemId: string, name: string) {
    applyBucketChange(itemId, null, name);
  }

  return {
    moveInTree,
    moveToDate,
    moveToBucket,
    moveToUnplanned,
    isMoving: (itemId) => moving.has(itemId),
  };
}
