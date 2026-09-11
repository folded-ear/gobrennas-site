import { AccessLevel } from "@/__generated__/graphql";

/** Anything with an id and ordered child ids: a plan, or one of its items. */
export type TreeSource = {
  readonly id: string;
  readonly children: readonly { readonly id: string }[];
};

/** A plan's tree as moves see it, the plan itself included. */
export type PlanTree = {
  readonly childrenOf: ReadonlyMap<string, readonly string[]>;
  readonly parentOf: ReadonlyMap<string, string>;
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
  for (const source of [plan, ...items]) {
    const ids = source.children.map((c) => c.id);
    childrenOf.set(source.id, ids);
    for (const id of ids) parentOf.set(id, source.id);
  }
  return { childrenOf, parentOf };
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
  return { childrenOf, parentOf };
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
  return (onDate.find((b) => b.name === null) ?? onDate[0])?.id ?? null;
}

/** I tell whether the viewer may change a plan's items. */
export function canChangePlan(plan: PlanAccess): boolean {
  return (
    plan.mine ||
    plan.grants.some((g) => g.user.me && CHANGING_LEVELS.has(g.level))
  );
}
