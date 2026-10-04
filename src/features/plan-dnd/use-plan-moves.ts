import { usePageEngine } from "@/features/page-engine";
import { displayName } from "@/lib/plan-item-name";
import { ApolloCache, Reference } from "@apollo/client";
import { useApolloClient, useMutation } from "@apollo/client/react";
import { toast } from "@heroui/react";
import { useMemo } from "react";
import { DoCreateBucketDocument } from "./__generated__/doCreateBucket.generated";
import {
  bucketChangeFor,
  bucketForDate,
  bucketForName,
  BucketSummary,
  PlanTree,
  TreeMove,
} from "./moves";

/** A plan as moves need it: its buckets, and which items it holds. */
export type MovePlan = {
  readonly id: string;
  readonly buckets: readonly BucketSummary[];
  readonly descendants: readonly { readonly id: string }[];
};

/** What names a named bucket's section, whichever plan's bucket it is. */
export type BucketName = {
  readonly name: string;
  readonly date: string | null;
};

type UsePlanMovesOptions = {
  plans: readonly MovePlan[];
  /** Every plan's tree, together. */
  tree: PlanTree;
};

/** The moves a planner can make. */
export type PlanMoves = {
  moveInTree(move: TreeMove, name: string): void;
  moveToDate(itemId: string, date: string, name: string): void;
  moveToBucket(itemId: string, bucket: BucketName, name: string): void;
  moveToUnplanned(itemId: string, name: string): void;
};

/** Keeps a stand-in bucket's id, and its optimistic layer's, off real ids. */
const STAND_IN_ID_PREFIX = "plan-dnd:";

// Plans are keyed as PlanItems too (build-in-memory-cache.ts), so this
// finds a parent whichever it is.
function itemCacheId(cache: ApolloCache, id: string): string | undefined {
  return cache.identify({ __typename: "PlanItem", id });
}

function reportFailure(name: string) {
  toast.danger(`Couldn't move ${displayName(name)}`);
}

/**
 * I make moves through the page engine, which shows each as done the
 * moment it's asked for, keeps it until the server has it, and undoes it
 * if the server refuses. A bucket an item joins is always one of its own
 * plan's. A bucket that doesn't exist yet is made first, directly.
 */
export function usePlanMoves({ plans, tree }: UsePlanMovesOptions): PlanMoves {
  const { cache } = useApolloClient();
  const engine = usePageEngine();
  const [createBucket] = useMutation(DoCreateBucketDocument, {
    context: { failureToast: false },
  });
  const planOf = useMemo(
    () =>
      new Map(
        plans.flatMap((plan) => plan.descendants.map((it) => [it.id, plan])),
      ),
    [plans],
  );

  function moveInTree(move: TreeMove, name: string) {
    const plan = planOf.get(move.ids[0]);
    if (plan === undefined) {
      reportFailure(name);
      return;
    }
    engine.move({
      kind: "move",
      ids: move.ids,
      planId: plan.id,
      parentId: move.parentId,
      afterId: move.afterId,
      name,
    });
  }

  async function assignNewBucket(
    itemId: string,
    planId: string,
    name: string,
    date: string | null,
    bucketName: string | null,
  ) {
    // Until the real bucket exists, a stand-in just like it carries the
    // item there, so it never shows anywhere but where it was dropped.
    const layerId = `${STAND_IN_ID_PREFIX}${itemId}:${date}:${bucketName}`;
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
              {
                __typename: "PlanBucket",
                id: layerId,
                date,
                name: bucketName,
              },
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
        variables: { planId, date, name: bucketName },
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
      engine.assignBucket({
        kind: "assignBucket",
        id: itemId,
        planId,
        name,
        bucketId: data!.planner.createBucket.id,
      });
    } finally {
      // The engine now shows the assignment, and the stand-in's bucket list
      // would hide the real bucket.
      cache.removeOptimistic(layerId);
    }
  }

  /**
   * I assign a bucket, clearing it instead when an ancestor already
   * carries the very one given, then clear it from any descendant left
   * duplicating what it would now inherit. They're sent together, so a
   * refused assignment moves nothing.
   */
  function applyBucketChange(
    itemId: string,
    newBucketId: string | null,
    name: string,
  ) {
    const plan = planOf.get(itemId);
    if (plan === undefined) {
      reportFailure(name);
      return;
    }
    const { ownBucketId, redundant } = bucketChangeFor(
      tree,
      itemId,
      newBucketId,
    );
    engine.set([
      {
        kind: "assignBucket",
        id: itemId,
        planId: plan.id,
        name,
        bucketId: ownBucketId,
      },
      ...redundant.map(
        (id) =>
          ({
            kind: "assignBucket",
            id,
            planId: plan.id,
            name,
            bucketId: null,
          }) as const,
      ),
    ]);
  }

  /** I join a bucket of the item's own plan, making it first if need be. */
  function joinOwnBucket(
    itemId: string,
    name: string,
    find: (buckets: readonly BucketSummary[]) => string | null,
    date: string | null,
    bucketName: string | null,
  ) {
    const plan = planOf.get(itemId);
    if (plan === undefined) {
      reportFailure(name);
      return;
    }
    const bucketId = find(plan.buckets);
    if (bucketId === null) {
      void assignNewBucket(itemId, plan.id, name, date, bucketName).catch(() =>
        reportFailure(name),
      );
      return;
    }
    applyBucketChange(itemId, bucketId, name);
  }

  function moveToDate(itemId: string, date: string, name: string) {
    joinOwnBucket(
      itemId,
      name,
      (buckets) => bucketForDate(buckets, date),
      date,
      null,
    );
  }

  function moveToBucket(itemId: string, bucket: BucketName, name: string) {
    joinOwnBucket(
      itemId,
      name,
      (buckets) => bucketForName(buckets, bucket.name, bucket.date),
      bucket.date,
      bucket.name,
    );
  }

  function moveToUnplanned(itemId: string, name: string) {
    applyBucketChange(itemId, null, name);
  }

  return { moveInTree, moveToDate, moveToBucket, moveToUnplanned };
}
