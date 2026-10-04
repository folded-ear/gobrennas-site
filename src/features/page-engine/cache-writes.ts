import { PlanItemStatus } from "@/__generated__/graphql";
import type { ApolloCache, Reference } from "@apollo/client";
import { PlanItemParentFragmentDoc } from "./__generated__/planItemParent.generated";
import { PlanItemResultFragmentDoc } from "./__generated__/planItemResult.generated";
import { CorePlanItemChildrenFragmentDoc } from "./__generated__/pollPlan.generated";
import { evictItem } from "./evict";
import { insertCreated } from "./insert";
import { mergePoll, PolledNode } from "./merge";
import type { CreateChange, MoveChange, SentChange } from "./state";

const REMOVALS: ReadonlySet<PlanItemStatus> = new Set([
  PlanItemStatus.COMPLETED,
  PlanItemStatus.DELETED,
]);

// Plans are keyed as PlanItems too (build-in-memory-cache.ts), so this
// finds a parent whichever it is.
const cacheIdOf = (cache: ApolloCache, id: string) =>
  cache.identify({ __typename: "PlanItem", id });

const refTo = (cache: ApolloCache, id: string): Reference => ({
  __ref: cacheIdOf(cache, id)!,
});

/** I name a parent as the cache types it, so writing it never retypes it. */
function parentOf(cache: ApolloCache, id: string) {
  const parent = cache.readFragment({
    fragment: CorePlanItemChildrenFragmentDoc,
    id: cacheIdOf(cache, id),
  });
  return { __typename: parent?.__typename ?? "PlanItem", id };
}

/** I write a pending create's item under its draft id, so lists can show it. */
export function writeDraft(cache: ApolloCache, change: CreateChange): void {
  cache.writeFragment({
    fragment: PlanItemResultFragmentDoc,
    fragmentName: "planItemResult",
    id: cacheIdOf(cache, change.id),
    // planItemResult spreads planItem masked, so its fields aren't typed.
    data: {
      __typename: "PlanItem",
      id: change.id,
      name: change.name,
      status: PlanItemStatus.NEEDED,
      notes: null,
      parent: parentOf(cache, change.parentId),
      aggregate: null,
      preparation: null,
      ingredient: null,
      quantity: null,
      components: [],
      bucket: change.bucketId
        ? { __typename: "PlanBucket", id: change.bucketId }
        : null,
      children: [],
    } as never,
  });
}

/** I remove a draft's item. */
export function evictDraft(cache: ApolloCache, id: string): void {
  cache.evict({ id: cacheIdOf(cache, id) });
}

/** I write a saved move: the parent's children, and the items' parents. */
function writeMove(
  cache: ApolloCache,
  change: Extract<SentChange, MoveChange>,
  children: readonly { id: string }[],
) {
  const parentCacheId = cacheIdOf(cache, change.parentId);
  const oldParentIds = new Set<string>();
  for (const id of change.ids) {
    const parent = cache.readFragment({
      fragment: PlanItemParentFragmentDoc,
      id: cacheIdOf(cache, id),
    })?.parent;
    if (parent && parent.id !== change.parentId) oldParentIds.add(parent.id);
  }
  cache.modify<{ children: readonly Reference[] }>({
    id: parentCacheId,
    fields: {
      children: () => children.map((it) => refTo(cache, it.id)),
    },
  });
  // By cache id, so the parent's own typename is never rewritten.
  for (const id of change.ids) {
    cache.modify<{ parent: Reference }>({
      id: cacheIdOf(cache, id),
      fields: { parent: () => ({ __ref: parentCacheId! }) },
    });
  }
  for (const oldParentId of oldParentIds) {
    cache.modify<{ children: readonly Reference[] }>({
      id: cacheIdOf(cache, oldParentId),
      fields: {
        children: (existing, { readField }) =>
          existing.filter(
            (ref) => !change.ids.includes(readField<string>("id", ref)!),
          ),
      },
    });
  }
}

type Answered = {
  readonly id?: string;
  readonly children?: readonly { id: string }[];
};

/**
 * I place what a saved batch moved, created, or removed; Apollo has
 * written the saved items themselves.
 */
export function writeSaved(
  cache: ApolloCache,
  changes: readonly SentChange[],
  data: unknown,
): void {
  const planner =
    (data as { planner?: Record<string, Answered | null> } | null)?.planner ??
    {};
  cache.batch({
    update: () =>
      changes.forEach((change, i) => {
        const result = planner[`s${i}`];
        if (!result) return;
        switch (change.kind) {
          case "status":
            if (REMOVALS.has(change.status)) evictItem(cache, change.id);
            return;
          case "create":
            insertCreated(cache, {
              id: result.id!,
              parentId: change.parentId,
              afterId: change.afterId,
              planId: change.planId,
            });
            return;
          case "move":
            writeMove(cache, change, result.children ?? []);
            return;
        }
      }),
  });
}

/** I write a poll's results, each plan's under its own alias. */
export function writePolled(
  cache: ApolloCache,
  planIds: readonly string[],
  data: unknown,
): void {
  const planner =
    (data as { planner?: Record<string, PolledNode[]> } | null)?.planner ?? {};
  cache.batch({
    update: () =>
      planIds.forEach((planId, i) =>
        mergePoll(cache, planId, planner[`p${i}`] ?? []),
      ),
  });
}
