"use client";

import { useDragSession } from "@/features/plan-dnd/drag-session";
import { ItemRow } from "@/features/plan-dnd/item-row";
import { PlanTree, TreeMove } from "@/features/plan-dnd/moves";
import { treeZones } from "@/features/plan-dnd/tree-zones";
import { TREE_ZONES } from "@/features/plan-dnd/zones";
import { PlanItem } from "@/features/plan-item";
import { PlanContext } from "@/features/plan-timeline/context";
import { PlanItemNode } from "@/features/plan-timeline/model";
import { DateChip } from "./chips";

type DrawerRowProps = {
  node: PlanItemNode;
  context: PlanContext;
  /** Left out, nothing can be dropped on me. */
  tree?: PlanTree;
  onMove?: (move: TreeMove, name: string) => void;
};

/**
 * I am one item's line in the drawer: it can be nested under, or put
 * before or after, by a drag from elsewhere in the drawer. When my item
 * sits apart from its parent, I say which day it has been moved to.
 */
export function DrawerRow({ node, context, tree, onMove }: DrawerRowProps) {
  const { dragged } = useDragSession();
  const { id, name } = node.item;
  const zones =
    dragged && tree && onMove
      ? treeZones({
          tree,
          dragged,
          target: { id, name },
          rects: TREE_ZONES,
          onMove: (move) => onMove(move, dragged.name),
        })
      : [];

  const own = context.get(id);
  // My own day is what the drawer cannot otherwise show: nothing here
  // stands under a date the way a timeline row does.
  const apartOn =
    own && own.separation !== null && own.date !== null ? own.date : null;

  return (
    <ItemRow itemId={id} name={name} zones={zones}>
      <PlanItem item={node.item} />
      {apartOn !== null ? (
        <span className="ms-auto">
          <DateChip date={apartOn} separation={own?.separation} />
        </span>
      ) : null}
    </ItemRow>
  );
}
