import { ItemKey } from "@/features/plan-changes/queue";
import { Draft, placeDraftsIn } from "@/features/plan-edit";
import { Region, ShoppingItem, ShoppingList, Source } from "./model";

/** One row of a list on the shopping view: a plan item, or a new one. */
export type ShoppingRow =
  | { readonly kind: "item"; readonly source: Source }
  | { readonly kind: "draft"; readonly draft: Draft };

/** Each list's rows as shown, and every row shown, top to bottom. */
export type ShoppingRows = {
  readonly groups: ReadonlyMap<string, readonly ShoppingRow[]>;
  readonly order: readonly ItemKey[];
};

/** The list of a region's plan items with no ingredient. */
export const LOOSE_NEEDED = "loose:needed";
export const LOOSE_ACQUIRED = "loose:acquired";

/** I name the list of a shopping item's plan items. */
export function groupOf(item: ShoppingItem): string {
  return `ingredient:${item.ingredient.id}`;
}

function keyOf(row: ShoppingRow): ItemKey {
  return row.kind === "item"
    ? { id: row.source.item.id }
    : { draftId: row.draft.draftId };
}

function draftRow(draft: Draft): ShoppingRow {
  return { kind: "draft", draft };
}

/**
 * I give every list's rows, new items among them: beside the row each
 * came from, or at the end of its own list when that row has gone. A new
 * item whose list has gone ends Needed's loose items. Only the expanded
 * shopping item's rows, and the loose items, are shown.
 */
export function shoppingRows(
  list: ShoppingList,
  expandedId: string | null,
  drafts: readonly Draft[],
): ShoppingRows {
  const groups = new Map<string, ShoppingRow[]>();
  const placed = new Set<string>();

  function place(group: string, sources: readonly Source[]) {
    const mine = drafts.filter((it) => it.group === group);
    const rows = placeDraftsIn(
      sources.map((source): ShoppingRow => ({ kind: "item", source })),
      keyOf,
      draftRow,
      mine,
      null,
      placed,
    );
    for (const draft of mine) {
      if (placed.has(draft.draftId)) continue;
      rows.push(draftRow(draft));
      placed.add(draft.draftId);
    }
    groups.set(group, rows);
  }

  const regions: readonly [Region, string][] = [
    [list.needed, LOOSE_NEEDED],
    [list.acquired, LOOSE_ACQUIRED],
  ];
  for (const [region, loose] of regions) {
    for (const item of region.items) place(groupOf(item), item.sources);
    place(loose, region.unresolved);
  }
  groups
    .get(LOOSE_NEEDED)!
    .push(...drafts.filter((it) => !placed.has(it.draftId)).map(draftRow));

  const order: ItemKey[] = [];
  for (const [region, loose] of regions) {
    for (const item of region.items) {
      if (item.ingredient.id !== expandedId) continue;
      order.push(...groups.get(groupOf(item))!.map(keyOf));
    }
    order.push(...groups.get(loose)!.map(keyOf));
  }
  return { groups, order };
}
