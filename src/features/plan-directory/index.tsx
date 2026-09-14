"use client";

import { orderPlans } from "@/lib/plans";
import { createContext, PropsWithChildren, useContext } from "react";

/** A plan as its indicators show it. */
export type DirectoryPlan = {
  readonly id: string;
  readonly name: string;
  readonly color: string;
};

/** A plan and what it holds, as a directory is built from. */
export type DirectorySource = DirectoryPlan & {
  readonly mine: boolean;
  readonly descendants: readonly { readonly id: string }[];
  readonly buckets: readonly { readonly id: string }[];
};

/** Which plan each item and bucket belongs to, among the plans available. */
export type PlanDirectory = {
  /** In plan order. */
  readonly plans: readonly DirectoryPlan[];
  readonly planOfItem: ReadonlyMap<string, DirectoryPlan>;
  readonly planOfBucket: ReadonlyMap<string, DirectoryPlan>;
};

const EMPTY_DIRECTORY: PlanDirectory = {
  plans: [],
  planOfItem: new Map(),
  planOfBucket: new Map(),
};

/** Fewer plans than this leave nothing for an indicator to tell apart. */
const MIN_PLANS_FOR_INDICATORS = 2;

const PlanDirectoryContext = createContext<PlanDirectory>(EMPTY_DIRECTORY);

/** I index every item and bucket of the given plans by the plan holding it. */
export function buildPlanDirectory(
  sources: readonly DirectorySource[],
): PlanDirectory {
  const plans: DirectoryPlan[] = [];
  const planOfItem = new Map<string, DirectoryPlan>();
  const planOfBucket = new Map<string, DirectoryPlan>();
  for (const { id, name, color, descendants, buckets } of orderPlans(sources)) {
    const plan = { id, name, color };
    plans.push(plan);
    for (const item of descendants) planOfItem.set(item.id, plan);
    for (const bucket of buckets) planOfBucket.set(bucket.id, plan);
  }
  return { plans, planOfItem, planOfBucket };
}

type PlanDirectoryProviderProps = PropsWithChildren<{
  directory: PlanDirectory;
}>;

/** I make a directory available to everything below me. */
export function PlanDirectoryProvider({
  directory,
  children,
}: PlanDirectoryProviderProps) {
  return (
    <PlanDirectoryContext value={directory}>{children}</PlanDirectoryContext>
  );
}

/** I give the plan an item belongs to, or nothing when no plan holds it. */
export function useItemPlan(itemId: string): DirectoryPlan | undefined {
  return useContext(PlanDirectoryContext).planOfItem.get(itemId);
}

/** I give a way to look up the plan any item belongs to. */
export function useItemPlanLookup(): (
  itemId: string,
) => DirectoryPlan | undefined {
  const { planOfItem } = useContext(PlanDirectoryContext);
  return (itemId) => planOfItem.get(itemId);
}

/** I give the plans some buckets belong to, each once, in plan order. */
export function useBucketPlans(
  bucketIds: readonly string[],
): readonly DirectoryPlan[] {
  const { plans, planOfBucket } = useContext(PlanDirectoryContext);
  const held = new Set(bucketIds.map((id) => planOfBucket.get(id)));
  return plans.filter((plan) => held.has(plan));
}

/** I tell whether there are enough plans for indicators to tell apart. */
export function useShowsPlanIndicators(): boolean {
  return (
    useContext(PlanDirectoryContext).plans.length >= MIN_PLANS_FOR_INDICATORS
  );
}
