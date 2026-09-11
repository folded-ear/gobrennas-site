import { ApolloCache, Reference } from "@apollo/client";
import { useApolloClient, useMutation } from "@apollo/client/react";
import { toast } from "@heroui/react";
import { useCallback, useState } from "react";
import { DoAssignBucketDocument } from "./__generated__/doAssignBucket.generated";
import { DoCreateBucketDocument } from "./__generated__/doCreateBucket.generated";
import { DoMutateTreeDocument } from "./__generated__/doMutateTree.generated";
import {
  applyTreeMove,
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
  isMoving(itemId: string): boolean;
};

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
              parent: { __typename: "PlanItem" as const, id: move.parentId },
            })),
          },
        },
      },
      update(c, { data }) {
        const moved = data?.planner.mutateTree.children;
        if (!moved) return;
        c.modify<{ children: readonly Reference[] }>({
          id: itemCacheId(c, move.parentId),
          fields: {
            children: (_, { toReference }) =>
              moved.flatMap(
                (it) =>
                  toReference({ __typename: "PlanItem", id: it.id }) ?? [],
              ),
          },
        });
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

  function assign(itemId: string, bucketId: string) {
    return assignBucket({
      variables: { id: itemId, bucketId },
      optimisticResponse: {
        planner: {
          __typename: "PlannerMutation",
          assignBucket: {
            __typename: "PlanItem",
            id: itemId,
            bucket: { __typename: "PlanBucket", id: bucketId },
          },
        },
      },
    });
  }

  async function assignNewBucket(itemId: string, date: string) {
    // Until the real bucket exists, a stand-in on the same date carries
    // the item there, so it never shows anywhere but where it was dropped.
    const layerId = `plan-dnd:${itemId}:${date}`;
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

  function moveToDate(itemId: string, date: string, name: string) {
    const bucketId = bucketForDate(buckets, date);
    const work = (
      bucketId === null
        ? assignNewBucket(itemId, date)
        : assign(itemId, bucketId).then(() => {})
    ).catch(() => reportFailure(name));
    track([itemId], work);
  }

  return {
    moveInTree,
    moveToDate,
    isMoving: (itemId) => moving.has(itemId),
  };
}
