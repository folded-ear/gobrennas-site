import { TimelineBucket, TimelineItem } from "./model";

/** How an item's date sits against its parent's. */
export type Separation = "early" | "late";

/** An item named as context for another: who it is, and when it happens. */
export type ItemRef = {
  readonly id: string;
  readonly name: string;
  readonly date: string;
};

/** Where one item sits, and what it sits under. */
export type ItemContext = {
  readonly date: string;
  /** My parent, or nothing when the plan itself holds me. */
  readonly parent: ItemRef | null;
  /** How my date sits against my parent's, or nothing when they agree. */
  readonly separation: Separation | null;
};

/** Every item in a plan, by id. */
export type PlanContext = ReadonlyMap<string, ItemContext>;

export type BuildPlanContextInput = {
  /** The plan's own children, in display order. */
  readonly rootIds: readonly string[];
  readonly items: readonly TimelineItem[];
  readonly buckets: readonly TimelineBucket[];
  readonly today: string;
};

/** I tell how one date sits against the date it would otherwise share. */
function separationOf(date: string, parentDate: string): Separation | null {
  if (date === parentDate) return null;
  // ISO dates order lexicographically, as `dates.ts` explains.
  return date < parentDate ? "early" : "late";
}

/**
 * I say where every item in a plan sits and what it sits under, the ones
 * the timeline hides included.
 */
export function buildPlanContext({
  rootIds,
  items,
  buckets,
  today,
}: BuildPlanContextInput): PlanContext {
  const byId = new Map(items.map((it) => [it.id, it]));
  const bucketDates = new Map(buckets.map((b) => [b.id, b.date]));
  const dateOf = new Map<string, string>();
  // `timelineItem` selects children, not a parent, so the walk records one.
  const parentOf = new Map<string, TimelineItem>();

  function visit(
    item: TimelineItem,
    parent: TimelineItem | null,
    inherited: string,
  ): void {
    // A cycle would come from data this app doesn't own.
    if (dateOf.has(item.id)) return;
    const own = item.bucket ? (bucketDates.get(item.bucket.id) ?? null) : null;
    const date = own ?? inherited;
    dateOf.set(item.id, date);
    if (parent !== null) parentOf.set(item.id, parent);
    for (const child of item.children) {
      const found = byId.get(child.id);
      if (found !== undefined) visit(found, item, date);
    }
  }

  for (const id of rootIds) {
    const root = byId.get(id);
    if (root !== undefined) visit(root, null, today);
  }

  const context = new Map<string, ItemContext>();
  for (const item of items) {
    const date = dateOf.get(item.id);
    // An item no root leads to isn't in the plan as the planner sees it.
    if (date === undefined) continue;
    const parentItem = parentOf.get(item.id);
    const parentDate =
      parentItem === undefined ? undefined : dateOf.get(parentItem.id);
    const parent =
      parentItem !== undefined && parentDate !== undefined
        ? { id: parentItem.id, name: parentItem.name, date: parentDate }
        : null;
    context.set(item.id, {
      date,
      parent,
      separation: parent === null ? null : separationOf(date, parent.date),
    });
  }
  return context;
}

/** I give an item's ancestors, root first, and nothing for a plan's child. */
export function ancestorsOf(
  context: PlanContext,
  id: string,
): readonly ItemRef[] {
  const chain: ItemRef[] = [];
  const seen = new Set<string>([id]);
  let parent = context.get(id)?.parent ?? null;
  // A cycle would come from data this app doesn't own.
  while (parent !== null && !seen.has(parent.id)) {
    seen.add(parent.id);
    chain.push(parent);
    parent = context.get(parent.id)?.parent ?? null;
  }
  return chain.reverse();
}
