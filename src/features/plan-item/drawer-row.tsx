"use client";

import { useDragSession } from "@/features/plan-dnd/drag-session";
import { ItemRow } from "@/features/plan-dnd/item-row";
import { PlanTree, TreeMove } from "@/features/plan-dnd/moves";
import { treeZones } from "@/features/plan-dnd/tree-zones";
import { TREE_ZONES } from "@/features/plan-dnd/zones";
import { PlanItem } from "@/features/plan-item";
import { PlanItemNode } from "@/features/plan-timeline/model";

type DrawerRowProps = {
  node: PlanItemNode;
  tree: PlanTree;
  onMove(move: TreeMove, name: string): void;
};

/**
 * I am one item's line in the drawer: it can be nested under, or put
 * before or after, by a drag from elsewhere in the drawer.
 */
export function DrawerRow({ node, tree, onMove }: DrawerRowProps) {
  const { dragged } = useDragSession();
  const { id, name } = node.item;
  const zones = dragged
    ? treeZones({
        tree,
        dragged,
        target: { id, name },
        rects: TREE_ZONES,
        onMove: (move) => onMove(move, dragged.name),
      })
    : [];

  return (
    <ItemRow itemId={id} name={name} zones={zones}>
      <PlanItem item={node.item} />
    </ItemRow>
  );
}
