import { AccessLevel } from "@/__generated__/graphql";

/** Anything with an id and ordered child ids: a plan, or one of its items. */
export type TreeSource = {
  readonly id: string;
  readonly children: readonly { readonly id: string }[];
  /** Left out for a plan, which carries no bucket of its own. */
  readonly bucket?: { readonly id: string } | null;
};

/** A plan's tree as moves see it, the plan itself included. */
export type PlanTree = {
  readonly childrenOf: ReadonlyMap<string, readonly string[]>;
  readonly parentOf: ReadonlyMap<string, string>;
  /** Each item's own bucket, or nothing for one that only inherits. */
  readonly bucketOf: ReadonlyMap<string, string | null>;
};

/** Where on a target item a dragged item lands. */
export type TreeZone = "child" | "before" | "after";

/** One move, shaped like `mutateTree`'s spec. */
export type TreeMove = {
  readonly ids: readonly string[];
  readonly parentId: string;
  readonly afterId: string | null;
};

export type BucketSummary = {
  readonly id: string;
  readonly date: string | null;
  readonly name: string | null;
};

export type PlanAccess = {
  readonly mine: boolean;
  readonly grants: readonly {
    readonly level: AccessLevel;
    readonly user: { readonly me: boolean };
  }[];
};

const CHANGING_LEVELS: ReadonlySet<AccessLevel> = new Set([
  AccessLevel.CHANGE,
  AccessLevel.ADMINISTER,
]);

/** I map a plan and its items into who holds whom. */
export function buildPlanTree(
  plan: TreeSource,
  items: readonly TreeSource[],
): PlanTree {
  const childrenOf = new Map<string, readonly string[]>();
  const parentOf = new Map<string, string>();
  const bucketOf = new Map<string, string | null>();
  for (const source of [plan, ...items]) {
    const ids = source.children.map((c) => c.id);
    childrenOf.set(source.id, ids);
    for (const id of ids) parentOf.set(id, source.id);
    bucketOf.set(source.id, source.bucket?.id ?? null);
  }
  return { childrenOf, parentOf, bucketOf };
}

/**
 * I give the move that drops one item on a zone of another, or nothing
 * when that drop would change nothing or would put an item inside itself.
 */
export function treeMove(
  tree: PlanTree,
  draggedId: string,
  targetId: string,
  zone: TreeZone,
): TreeMove | null {
  if (draggedId === targetId || isWithin(tree, targetId, draggedId)) {
    return null;
  }
  const move = zoneMove(tree, draggedId, targetId, zone);
  if (move === null || changesNothing(tree, move)) return null;
  return move;
}

function zoneMove(
  tree: PlanTree,
  draggedId: string,
  targetId: string,
  zone: TreeZone,
): TreeMove | null {
  if (zone === "child") {
    if (!tree.childrenOf.has(targetId)) return null;
    return { ids: [draggedId], parentId: targetId, afterId: null };
  }
  const parentId = tree.parentOf.get(targetId);
  if (parentId === undefined) return null;
  if (zone === "after") {
    return { ids: [draggedId], parentId, afterId: targetId };
  }
  const siblings = (tree.childrenOf.get(parentId) ?? []).filter(
    (id) => id !== draggedId,
  );
  const index = siblings.indexOf(targetId);
  return {
    ids: [draggedId],
    parentId,
    afterId: index > 0 ? siblings[index - 1] : null,
  };
}

/** I tell whether an item sits somewhere below an ancestor. */
function isWithin(tree: PlanTree, id: string, ancestorId: string): boolean {
  const seen = new Set<string>();
  for (
    let at = tree.parentOf.get(id);
    at !== undefined && !seen.has(at);
    at = tree.parentOf.get(at)
  ) {
    if (at === ancestorId) return true;
    seen.add(at);
  }
  return false;
}

function changesNothing(tree: PlanTree, move: TreeMove): boolean {
  if (move.ids.some((id) => tree.parentOf.get(id) !== move.parentId)) {
    return false;
  }
  const before = tree.childrenOf.get(move.parentId) ?? [];
  const after = applyTreeMove(tree, move).childrenOf.get(move.parentId) ?? [];
  return before.every((id, i) => after[i] === id);
}

/** I give the tree as it stands once a move is made, leaving mine alone. */
export function applyTreeMove(tree: PlanTree, move: TreeMove): PlanTree {
  const childrenOf = new Map(tree.childrenOf);
  const parentOf = new Map(tree.parentOf);
  let afterId = move.afterId;
  for (const id of move.ids) {
    const oldParentId = parentOf.get(id);
    if (oldParentId !== undefined) {
      childrenOf.set(
        oldParentId,
        (childrenOf.get(oldParentId) ?? []).filter((c) => c !== id),
      );
    }
    const siblings = [...(childrenOf.get(move.parentId) ?? [])];
    siblings.splice(
      afterId === null ? 0 : siblings.indexOf(afterId) + 1,
      0,
      id,
    );
    childrenOf.set(move.parentId, siblings);
    parentOf.set(id, move.parentId);
    afterId = id;
  }
  return { childrenOf, parentOf, bucketOf: tree.bucketOf };
}

/**
 * I pick the bucket a drop on a date joins: the first unnamed one on that
 * date, else the first named one, else none.
 */
export function bucketForDate(
  buckets: readonly BucketSummary[],
  date: string,
): string | null {
  const onDate = buckets.filter((b) => b.date === date);
  return (onDate.find((b) => !isNamedBucket(b)) ?? onDate[0])?.id ?? null;
}

/** I say whether a bucket is named: its name has more than whitespace. */
export function isNamedBucket<B extends BucketSummary>(
  bucket: B,
): bucket is B & { readonly name: string } {
  return bucket.name !== null && bucket.name.trim() !== "";
}

/** What a bucket assignment really touches, once redundant copies fold away. */
export type BucketChange = {
  /**
   * What the dropped item's own bucket becomes: the one it was given, or
   * nothing when an ancestor already carries it, so it would inherit the
   * very same bucket anyway.
   */
  readonly ownBucketId: string | null;
  /**
   * Descendants whose own bucket duplicates what they'd now inherit from
   * the dropped item, and so should be cleared rather than left explicit.
   */
  readonly redundant: readonly string[];
};

/** I give an item's own bucket by walking up past everything that inherits. */
function nearestAncestorBucket(tree: PlanTree, itemId: string): string | null {
  const seen = new Set<string>([itemId]);
  for (
    let at = tree.parentOf.get(itemId);
    at !== undefined && !seen.has(at);
    at = tree.parentOf.get(at)
  ) {
    const bucket = tree.bucketOf.get(at) ?? null;
    if (bucket !== null) return bucket;
    seen.add(at);
  }
  return null;
}

/**
 * I give every descendant of an item that carries a bucket of its own
 * matching one it would inherit anyway, stopping each branch at its first
 * bucketed item either way: that item's own descendants inherit from it,
 * not from the item this walk started at.
 */
function redundantDescendants(
  tree: PlanTree,
  itemId: string,
  effectiveBucket: string,
): readonly string[] {
  const redundant: string[] = [];
  const visited = new Set<string>([itemId]);
  function walk(id: string): void {
    for (const childId of tree.childrenOf.get(id) ?? []) {
      // A cycle would come from data this app doesn't own.
      if (visited.has(childId)) continue;
      visited.add(childId);
      const own = tree.bucketOf.get(childId) ?? null;
      if (own !== null) {
        if (own === effectiveBucket) redundant.push(childId);
        continue;
      }
      walk(childId);
    }
  }
  walk(itemId);
  return redundant;
}

/**
 * I say what a bucket assignment should really change: the dropped item's
 * own bucket, cleared instead of set when an ancestor already carries the
 * very one it was dropped on, and every descendant whose own bucket now
 * just duplicates what it would inherit regardless.
 */
export function bucketChangeFor(
  tree: PlanTree,
  itemId: string,
  newBucketId: string | null,
): BucketChange {
  const inherited = nearestAncestorBucket(tree, itemId);
  const ownBucketId =
    newBucketId !== null && newBucketId === inherited ? null : newBucketId;
  const effective = ownBucketId ?? inherited;
  return {
    ownBucketId,
    redundant:
      effective === null ? [] : redundantDescendants(tree, itemId, effective),
  };
}

/** I tell whether the viewer may change a plan's items. */
export function canChangePlan(plan: PlanAccess): boolean {
  return (
    plan.mine ||
    plan.grants.some((g) => g.user.me && CHANGING_LEVELS.has(g.level))
  );
}
