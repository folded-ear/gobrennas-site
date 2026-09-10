import { PlanItemFragment } from "@/features/plan-item/__generated__/planItem.generated";
import { FragmentType } from "@apollo/client";
import { TimelineItemFragment } from "./__generated__/timelineItem.generated";
import { addDays, diffDays } from "./dates";

/**
 * A plan item as the timeline sees it: the fields the timeline reads,
 * plus the reference `plan-item`'s own components unmask for themselves.
 */
export type TimelineItem = TimelineItemFragment &
  FragmentType<PlanItemFragment>;

/** A plan bucket reduced to what dates an item: its date, or nothing. */
export type TimelineBucket = {
  readonly id: string;
  readonly date: string | null;
};

/** One item and whatever the timeline shows beneath it. */
export type PlanItemNode = {
  readonly item: TimelineItem;
  readonly children: readonly PlanItemNode[];
};

/** One calendar day and the item trees rooted in it. */
export type TimelineDay = {
  readonly kind: "day";
  readonly date: string;
  readonly roots: readonly PlanItemNode[];
};

/** A run of days carrying nothing, shown as a break instead of as days. */
export type TimelineGap = {
  readonly kind: "gap";
  readonly after: string;
  readonly before: string;
  readonly days: number;
};

export type TimelineEntry = TimelineDay | TimelineGap;

export type BuildTimelineInput = {
  /** The plan's own children, in display order. */
  readonly rootIds: readonly string[];
  readonly items: readonly TimelineItem[];
  readonly buckets: readonly TimelineBucket[];
  readonly today: string;
};

/** A week counted inclusively: the day itself plus six more. */
const WEEK_RADIUS_DAYS = 6;

type Span = [start: string, end: string];

type MutableNode = {
  readonly item: TimelineItem;
  readonly children: MutableNode[];
};

type Parent = {
  readonly node: MutableNode;
  readonly date: string;
};

export function buildTimeline(
  input: BuildTimelineInput,
): readonly TimelineEntry[] {
  return layOutDates(groupRootsByDate(input), input.today);
}

function groupRootsByDate({
  rootIds,
  items,
  buckets,
  today,
}: BuildTimelineInput): ReadonlyMap<string, readonly PlanItemNode[]> {
  const byId = new Map(items.map((it) => [it.id, it]));
  const bucketDates = new Map(buckets.map((b) => [b.id, b.date]));
  const byDate = new Map<string, MutableNode[]>();
  const visited = new Set<string>();

  function rootsOn(date: string): MutableNode[] {
    const existing = byDate.get(date);
    if (existing !== undefined) return existing;
    const created: MutableNode[] = [];
    byDate.set(date, created);
    return created;
  }

  function visit(id: string, parent: Parent | null, inherited: string): void {
    const item = byId.get(id);
    // A dangling id or a cycle would come from data this app doesn't own.
    if (item === undefined || visited.has(id)) return;
    visited.add(id);

    const own = item.bucket ? (bucketDates.get(item.bucket.id) ?? null) : null;
    const date = own ?? inherited;

    const hidden =
      parent !== null && item.bucket === null && item.children.length === 0;
    if (hidden) return;

    const node: MutableNode = { item, children: [] };
    if (parent !== null && parent.date === date) {
      parent.node.children.push(node);
    } else {
      rootsOn(date).push(node);
    }
    for (const child of item.children) {
      visit(child.id, { node, date }, date);
    }
  }

  for (const id of rootIds) {
    visit(id, null, today);
  }
  return byDate;
}

function layOutDates(
  roots: ReadonlyMap<string, readonly PlanItemNode[]>,
  today: string,
): readonly TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  let previousEnd: string | null = null;

  for (const [start, end] of mergeSpans(buildSpans([...roots.keys()], today))) {
    if (previousEnd !== null) {
      entries.push({
        kind: "gap",
        after: previousEnd,
        before: start,
        days: diffDays(previousEnd, start) - 1,
      });
    }
    for (let date = start; date <= end; date = addDays(date, 1)) {
      entries.push({
        kind: "day",
        date,
        roots: roots.get(date) ?? [],
      });
    }
    previousEnd = end;
  }
  return entries;
}

/**
 * I give every dated item a span to sit in: bare for the past, a week
 * either side for the future, and today's own week regardless.
 */
function buildSpans(dates: readonly string[], today: string): readonly Span[] {
  const spans: Span[] = [[today, addDays(today, WEEK_RADIUS_DAYS)]];
  for (const date of dates) {
    if (date < today) {
      spans.push([date, date]);
      continue;
    }
    const start = addDays(date, -WEEK_RADIUS_DAYS);
    spans.push([
      start < today ? today : start,
      addDays(date, WEEK_RADIUS_DAYS),
    ]);
  }
  return spans;
}

function mergeSpans(spans: readonly Span[]): readonly Span[] {
  const sorted = [...spans].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const merged: Span[] = [];
  for (const [start, end] of sorted) {
    const last = merged.at(-1);
    // Adjacent spans merge too, or they'd render a gap of zero days.
    if (last !== undefined && start <= addDays(last[1], 1)) {
      if (end > last[1]) last[1] = end;
    } else {
      merged.push([start, end]);
    }
  }
  return merged;
}

/**
 * I give every descendant of one item, nested, however deep and whether
 * or not the timeline would show it.
 */
export function buildSubtree(
  items: readonly TimelineItem[],
  rootId: string,
): readonly PlanItemNode[] {
  const byId = new Map(items.map((it) => [it.id, it]));
  const visited = new Set<string>();

  function childrenOf(id: string): readonly PlanItemNode[] {
    const item = byId.get(id);
    if (item === undefined || visited.has(id)) return [];
    visited.add(id);

    const nodes: PlanItemNode[] = [];
    for (const child of item.children) {
      const found = byId.get(child.id);
      if (found === undefined) continue;
      nodes.push({ item: found, children: childrenOf(child.id) });
    }
    return nodes;
  }

  return childrenOf(rootId);
}
