import { ItemKey } from "@/features/plan-changes/queue";
import { PlanTree } from "@/features/plan-dnd/moves";
import { PlanItemNode } from "@/features/plan-timeline/model";

/** Whether a new item is being typed, or its create is being sent. */
export type DraftState = "editing" | "saving";

/** Where a new item shows: beside a row, or first in a parent's list. */
export type Beside =
  | { readonly key: ItemKey; readonly side: "before" | "after" }
  | { readonly firstIn: string };

/** A new item, not yet created. */
export type Draft = {
  readonly draftId: string;
  readonly planId: string;
  readonly parentId: string;
  /** Where the item goes in its plan: after this sibling, or first. */
  readonly afterId: ItemKey | null;
  readonly beside: Beside;
  /** Assigned once created; left out, the item only inherits one. */
  readonly bucketId?: string | null;
  /** On a surface of flat lists, the list I was made in. */
  readonly group?: string;
  readonly text: string;
  readonly state: DraftState;
};

/** One row of a tree as shown: an item above its own rows, or a draft. */
export type TreeEntry =
  | {
      readonly kind: "item";
      readonly node: PlanItemNode;
      readonly children: readonly TreeEntry[];
    }
  | { readonly kind: "draft"; readonly draft: Draft };

/** I give a key as a string, the same for the same item. */
export function keyString(key: ItemKey): string {
  return "id" in key ? `id:${key.id}` : `draft:${key.draftId}`;
}

export function sameKey(a: ItemKey | null, b: ItemKey | null): boolean {
  return a !== null && b !== null && keyString(a) === keyString(b);
}

function keyOf(entry: TreeEntry): ItemKey {
  return entry.kind === "item"
    ? { id: entry.node.item.id }
    : { draftId: entry.draft.draftId };
}

/**
 * I put drafts among a list's rows, each in creation order: a first child
 * at the front, anything else right beside its row, so the newest of
 * several sits nearest the row they came from. Each draft I place lands
 * in `placed`.
 */
export function placeDraftsIn<T>(
  rows: readonly T[],
  keyOf: (row: T) => ItemKey,
  rowOf: (draft: Draft) => T,
  drafts: readonly Draft[],
  parentId: string | null,
  placed: Set<string>,
): T[] {
  const list = [...rows];
  for (const draft of drafts) {
    const { beside } = draft;
    let at: number;
    if ("firstIn" in beside) {
      if (beside.firstIn !== parentId) continue;
      at = 0;
    } else {
      const anchor = list.findIndex((it) => sameKey(keyOf(it), beside.key));
      if (anchor < 0) continue;
      at = beside.side === "before" ? anchor : anchor + 1;
    }
    list.splice(at, 0, rowOf(draft));
    placed.add(draft.draftId);
  }
  return list;
}

function draftEntry(draft: Draft): TreeEntry {
  return { kind: "draft", draft };
}

function build(
  nodes: readonly PlanItemNode[],
  drafts: readonly Draft[],
  parentId: string | null,
  placed: Set<string>,
): TreeEntry[] {
  const entries: TreeEntry[] = nodes.map((node) => ({
    kind: "item",
    node,
    children: build(node.children, drafts, node.item.id, placed),
  }));
  return placeDraftsIn(entries, keyOf, draftEntry, drafts, parentId, placed);
}

/**
 * I give a tree's rows as shown, drafts among them. A draft whose row is
 * gone shows at the end.
 */
export function buildEntries(
  nodes: readonly PlanItemNode[],
  drafts: readonly Draft[],
  topParentId: string | null,
): readonly TreeEntry[] {
  const placed = new Set<string>();
  const entries = build(nodes, drafts, topParentId, placed);
  const orphans = drafts.filter((it) => !placed.has(it.draftId));
  return [...entries, ...orphans.map(draftEntry)];
}

/** I give every row's key, top to bottom, after any heading. */
export function treeOrder(
  entries: readonly TreeEntry[],
  heading: ItemKey | null = null,
): readonly ItemKey[] {
  const order: ItemKey[] = heading === null ? [] : [heading];
  const walk = (list: readonly TreeEntry[]) => {
    for (const entry of list) {
      order.push(keyOf(entry));
      if (entry.kind === "item") walk(entry.children);
    }
  };
  walk(entries);
  return order;
}

/**
 * I give the sibling an item follows once its parent's drafts are
 * created where they're placed, or null when it's first.
 */
export function siblingBefore(
  tree: PlanTree,
  drafts: readonly Draft[],
  parentId: string,
  key: ItemKey,
): ItemKey | null {
  const siblings: ItemKey[] = (tree.childrenOf.get(parentId) ?? []).map(
    (id) => ({ id }),
  );
  for (const draft of drafts) {
    if (draft.parentId !== parentId) continue;
    const at =
      draft.afterId === null
        ? 0
        : siblings.findIndex((it) => sameKey(it, draft.afterId)) + 1;
    if (draft.afterId !== null && at === 0) continue;
    siblings.splice(at, 0, { draftId: draft.draftId });
  }
  const at = siblings.findIndex((it) => sameKey(it, key));
  return at > 0 ? siblings[at - 1] : null;
}

/**
 * I retire one draft, pointing drafts placed after it at `afterId`, and
 * drafts shown beside it wherever `beside` says.
 */
function repoint(
  drafts: readonly Draft[],
  draftId: string,
  afterId: ItemKey | null,
  beside: (shown: Beside) => Beside,
): readonly Draft[] {
  const gone: ItemKey = { draftId };
  return drafts
    .filter((it) => it.draftId !== draftId)
    .map((it) => ({
      ...it,
      afterId: sameKey(it.afterId, gone) ? afterId : it.afterId,
      beside:
        "key" in it.beside && sameKey(it.beside.key, gone)
          ? beside(it.beside)
          : it.beside,
    }));
}

/**
 * I throw a draft away. Drafts placed after it take its place, and drafts
 * shown beside it take its spot.
 */
export function dropDraft(
  drafts: readonly Draft[],
  draftId: string,
): readonly Draft[] {
  const dropped = drafts.find((it) => it.draftId === draftId);
  if (dropped === undefined) return drafts;
  return repoint(drafts, draftId, dropped.afterId, () => dropped.beside);
}

/**
 * I retire a draft now created as an item. Drafts placed after it follow
 * the item's id. Drafts shown beside it stay beside the item when it stays
 * where its draft was, or take the draft's spot when it moves away.
 */
export function settleDraft(
  drafts: readonly Draft[],
  draftId: string,
  id: string,
  stayPut: boolean,
): readonly Draft[] {
  const settled = drafts.find((it) => it.draftId === draftId);
  if (settled === undefined) return drafts;
  return repoint(drafts, draftId, { id }, (shown) =>
    stayPut && "key" in shown
      ? { key: { id }, side: shown.side }
      : settled.beside,
  );
}
