"use client";

import { PlanDnd } from "@/features/plan-dnd";
import { useDragSession } from "@/features/plan-dnd/drag-session";
import { ItemRow } from "@/features/plan-dnd/item-row";
import { treeZones } from "@/features/plan-dnd/tree-zones";
import { REORDER_ZONES } from "@/features/plan-dnd/zones";
import { PlanItem } from "@/features/plan-item";
import { PlanItemNode } from "./model";

/** A plan's moves, plus what the timeline knows of where items show. */
export type TimelineDnd = PlanDnd & {
  readonly rootIds: ReadonlySet<string>;
  readonly dayOf: ReadonlyMap<string, string>;
};

type TimelineRowProps = {
  node: PlanItemNode;
  date: string;
  dnd: TimelineDnd;
  onSelect?: (id: string) => void;
};

/**
 * I am one item's line on the timeline. When I'm top-level, another
 * top-level item on my day can be put before or after me.
 */
export function TimelineRow({ node, date, dnd, onSelect }: TimelineRowProps) {
  const { dragged } = useDragSession();
  const { id, name } = node.item;
  const reorderable =
    dragged !== null &&
    dnd.rootIds.has(id) &&
    dnd.rootIds.has(dragged.id) &&
    dnd.dayOf.get(dragged.id) === date;
  const zones = reorderable
    ? treeZones({
        tree: dnd.tree,
        dragged,
        target: { id, name },
        rects: REORDER_ZONES,
        onMove: (move) => dnd.moves.moveInTree(move, dragged.name),
      })
    : [];

  return (
    <ItemRow itemId={id} name={name} zones={zones}>
      <PlanItem item={node.item} onSelect={onSelect} />
    </ItemRow>
  );
}
