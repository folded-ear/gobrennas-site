import { canonBucketName, isNamedBucket } from "@/features/plan-dnd/moves";
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

/** A plan bucket: what dates an item, and whether it's named. */
export type TimelineBucket = {
  readonly id: string;
  readonly date: string | null;
  readonly name: string | null;
};

/** One item and whatever the timeline shows beneath it. */
export type PlanItemNode = {
  readonly item: TimelineItem;
  readonly children: readonly PlanItemNode[];
};

/** One calendar day and the item trees rooted directly in it. */
export type TimelineDay = {
  readonly kind: "day";
  readonly date: string;
  readonly roots: readonly PlanItemNode[];
};

/** The section of one or more named buckets sharing a name and date. */
export type TimelineBucketSection = {
  readonly kind: "bucket";
  readonly key: string;
  /** Every bucket sharing my name and date, in the order they came. */
  readonly bucketIds: readonly string[];
  readonly name: string;
  readonly date: string | null;
  readonly roots: readonly PlanItemNode[];
};

/** Items with no bucket to place them anywhere else. */
export type TimelineUnplanned = {
  readonly kind: "unplanned";
  readonly roots: readonly PlanItemNode[];
};

/** A run of days carrying nothing, shown as a break instead of as days. */
export type TimelineGap = {
  readonly kind: "gap";
  readonly after: string;
  readonly before: string;
  readonly days: number;
};

/** Any section an item can sit in. */
export type TimelineSection =
  TimelineDay | TimelineBucketSection | TimelineUnplanned;

export type TimelineEntry =
  TimelineDay | TimelineBucketSection | TimelineUnplanned | TimelineGap;

/** One plan, as the timeline lays it out. */
export type TimelinePlan = {
  /** The plan's own children, in display order. */
  readonly rootIds: readonly string[];
  readonly items: readonly TimelineItem[];
  readonly buckets: readonly TimelineBucket[];
};

export type BuildTimelineInput = {
  /** In plan order. */
  readonly plans: readonly TimelinePlan[];
  readonly today: string;
};

/** A week counted inclusively: the day itself plus six more. */
const WEEK_RADIUS_DAYS = 6;

/** The section key for items with no bucket to place them anywhere else. */
export const UNPLANNED_SECTION = "unplanned";

const BUCKET_SECTION_PREFIX = "bucket:";

/** I give the section key named buckets sharing a name and date group under. */
export function bucketSectionKey(name: string, date: string | null): string {
  return `${BUCKET_SECTION_PREFIX}${canonBucketName(name)}@${date ?? ""}`;
}

/**
 * I give the one section a key names, with what every plan roots in it, or
 * nothing when the key names a bucket section no bucket has.
 */
export function buildSection(
  plans: readonly TimelinePlan[],
  key: string,
): TimelineSection | null {
  const bySection = groupRootsBySection(plans);
  const roots = bySection.get(key) ?? [];
  if (key === UNPLANNED_SECTION) return { kind: "unplanned", roots };
  if (isDateKey(key)) return { kind: "day", date: key, roots };
  const buckets = plans.flatMap((plan) => plan.buckets);
  return bucketSectionsOf(buckets, bySection).get(key) ?? null;
}

/** I gather named buckets sharing a name and date into their sections. */
function bucketSectionsOf(
  buckets: readonly TimelineBucket[],
  bySection: ReadonlyMap<string, readonly PlanItemNode[]>,
): ReadonlyMap<string, TimelineBucketSection> {
  const sectionsByKey = new Map<string, TimelineBucketSection>();
  for (const bucket of buckets.filter(isNamedBucket)) {
    const key = bucketSectionKey(bucket.name, bucket.date);
    const existing = sectionsByKey.get(key);
    sectionsByKey.set(key, {
      kind: "bucket",
      key,
      bucketIds: [...(existing?.bucketIds ?? []), bucket.id],
      name: existing?.name ?? bucket.name,
      date: bucket.date,
      roots: bySection.get(key) ?? [],
    });
  }
  return sectionsByKey;
}

function isDateKey(key: string): boolean {
  return key !== UNPLANNED_SECTION && !key.startsWith(BUCKET_SECTION_PREFIX);
}

type Span = [start: string, end: string];

type MutableNode = {
  readonly item: TimelineItem;
  readonly children: MutableNode[];
};

type Parent = {
  readonly node: MutableNode;
  readonly key: string;
};

export function buildTimeline(
  input: BuildTimelineInput,
): readonly TimelineEntry[] {
  return layOutTimeline(
    groupRootsBySection(input.plans),
    input.plans.flatMap((plan) => plan.buckets),
    input.today,
  );
}

/**
 * I give an item's own section key: a day for a plain dated bucket, a
 * bucket's own section for a named one (dated or not), or nothing when its
 * bucket doesn't place it anywhere of its own.
 */
function ownSectionKey(
  item: TimelineItem,
  bucketById: ReadonlyMap<string, TimelineBucket>,
): string | null {
  if (item.bucket === null) return null;
  const bucket = bucketById.get(item.bucket.id);
  if (bucket === undefined) return null;
  if (isNamedBucket(bucket)) {
    return bucketSectionKey(bucket.name, bucket.date);
  }
  return bucket.date;
}

function groupRootsBySection(
  plans: readonly TimelinePlan[],
): ReadonlyMap<string, readonly PlanItemNode[]> {
  const byId = new Map(
    plans.flatMap((plan) => plan.items).map((it) => [it.id, it]),
  );
  const bucketById = new Map(
    plans.flatMap((plan) => plan.buckets).map((b) => [b.id, b]),
  );
  const bySection = new Map<string, MutableNode[]>();
  const visited = new Set<string>();

  function rootsIn(key: string): MutableNode[] {
    const existing = bySection.get(key);
    if (existing !== undefined) return existing;
    const created: MutableNode[] = [];
    bySection.set(key, created);
    return created;
  }

  function visit(id: string, parent: Parent | null, inherited: string): void {
    const item = byId.get(id);
    // A dangling id or a cycle would come from data this app doesn't own.
    if (item === undefined || visited.has(id)) return;
    visited.add(id);

    const key = ownSectionKey(item, bucketById) ?? inherited;

    const hidden =
      parent !== null && item.bucket === null && item.children.length === 0;
    if (hidden) return;

    const node: MutableNode = { item, children: [] };
    if (parent !== null && parent.key === key) {
      parent.node.children.push(node);
    } else {
      rootsIn(key).push(node);
    }
    for (const child of item.children) {
      visit(child.id, { node, key }, key);
    }
  }

  for (const id of plans.flatMap((plan) => plan.rootIds)) {
    visit(id, null, UNPLANNED_SECTION);
  }
  return bySection;
}

function layOutTimeline(
  bySection: ReadonlyMap<string, readonly PlanItemNode[]>,
  buckets: readonly TimelineBucket[],
  today: string,
): readonly TimelineEntry[] {
  const bucketSections = [...bucketSectionsOf(buckets, bySection).values()];
  const datedByDate = new Map<string, TimelineBucketSection[]>();
  for (const section of bucketSections) {
    if (section.date === null) continue;
    const onDate = datedByDate.get(section.date) ?? [];
    onDate.push(section);
    datedByDate.set(section.date, onDate);
  }
  const undatedSections = bucketSections.filter((b) => b.date === null);

  const dayDates = [...bySection.keys()].filter(isDateKey);
  const bucketDates = [...datedByDate.keys()];

  const entries: TimelineEntry[] = [];
  let previousEnd: string | null = null;

  for (const [start, end] of mergeSpans(
    buildSpans([...dayDates, ...bucketDates], today),
  )) {
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
        roots: bySection.get(date) ?? [],
      });
      entries.push(...(datedByDate.get(date) ?? []));
      // Today's own extras: buckets no date claims, then whatever has no
      // bucket at all, both always shown, right before tomorrow.
      if (date === today) {
        entries.push(...undatedSections);
        entries.push({
          kind: "unplanned",
          roots: bySection.get(UNPLANNED_SECTION) ?? [],
        });
      }
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

/** I map each item the timeline shows to the section it shows in. */
export function sectionOfItems(
  entries: readonly TimelineEntry[],
): ReadonlyMap<string, string> {
  const sections = new Map<string, string>();
  function visit(nodes: readonly PlanItemNode[], key: string): void {
    for (const node of nodes) {
      sections.set(node.item.id, key);
      visit(node.children, key);
    }
  }
  for (const entry of entries) {
    if (entry.kind === "day") visit(entry.roots, entry.date);
    else if (entry.kind === "bucket") {
      visit(entry.roots, entry.key);
    } else if (entry.kind === "unplanned") {
      visit(entry.roots, UNPLANNED_SECTION);
    }
  }
  return sections;
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
