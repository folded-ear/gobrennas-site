import { PlanItemStatus } from "@/__generated__/graphql";
import { ApolloCache, Reference } from "@apollo/client";
import {
  PlanItemResultFragment,
  PlanItemResultFragmentDoc,
} from "../plan-changes/__generated__/planItemResult.generated";
import { evictItem } from "../plan-changes/evict";
import {
  CorePlanItemChildrenFragmentDoc,
  PollPlanFragment,
  PollPlanFragmentDoc,
} from "./__generated__/pollPlan.generated";

export type PolledNode = PlanItemResultFragment | PollPlanFragment;

const TRASHED: ReadonlySet<PlanItemStatus> = new Set([
  PlanItemStatus.COMPLETED,
  PlanItemStatus.DELETED,
]);

const isPlan = (node: PolledNode): node is PollPlanFragment =>
  node.__typename === "Plan";

/** I give the ids reachable below a plan's top-level items, parents first. */
function reachableIds(cache: ApolloCache, planId: string): string[] {
  const childrenOf = (cacheId: string | undefined) =>
    cache.readFragment({
      fragment: CorePlanItemChildrenFragmentDoc,
      id: cacheId,
    })?.children ?? [];
  const found = new Set<string>();
  const visit = (id: string) => {
    if (found.has(id)) return;
    found.add(id);
    childrenOf(cache.identify({ __typename: "PlanItem", id })).forEach((it) =>
      visit(it.id),
    );
  };
  childrenOf(cache.identify({ __typename: "Plan", id: planId })).forEach((it) =>
    visit(it.id),
  );
  return [...found];
}

/**
 * I write a poll's results for one plan into the cache, as the server
 * returned them. Completed and deleted items are evicted with everything
 * below them. A plan's descendants are then whatever its top-level items
 * lead to, so an item no parent lists is never shown, whatever its status.
 */
export function mergePoll(
  cache: ApolloCache,
  planId: string,
  results: readonly PolledNode[],
): void {
  const trashed: string[] = [];
  for (const node of results) {
    if (isPlan(node)) {
      cache.writeFragment({
        fragment: PollPlanFragmentDoc,
        id: cache.identify(node),
        data: node,
      });
    } else if (TRASHED.has(node.status)) {
      trashed.push(node.id);
    } else {
      cache.writeFragment({
        fragment: PlanItemResultFragmentDoc,
        fragmentName: "planItemResult",
        id: cache.identify(node),
        data: node,
      });
    }
  }
  trashed.forEach((id) => evictItem(cache, id));

  const planCacheId = cache.identify({ __typename: "Plan", id: planId });
  const reachable = reachableIds(cache, planId);
  cache.modify<{ descendants: readonly Reference[] }>({
    id: planCacheId,
    fields: {
      descendants: (existing, { readField }) => {
        const kept = existing.filter((ref) =>
          reachable.includes(readField<string>("id", ref)!),
        );
        const keptIds = new Set(
          kept.map((ref) => readField<string>("id", ref)),
        );
        const added = reachable
          .filter((id) => !keptIds.has(id))
          .map((id) => ({
            __ref: cache.identify({ __typename: "PlanItem", id })!,
          }));
        return added.length === 0 && kept.length === existing.length
          ? existing
          : [...kept, ...added];
      },
    },
  });
}
