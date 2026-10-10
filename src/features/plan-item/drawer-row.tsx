"use client";

import { useItemPlanLookup } from "@/features/plan-directory";
import { PlanTree, TreeMove } from "@/features/plan-dnd/moves";
import { treeZones } from "@/features/plan-dnd/tree-zones";
import { TREE_ZONES } from "@/features/plan-dnd/zones";
import { EditableName } from "@/features/plan-edit";
import { PlanItem } from "@/features/plan-item";
import { useItemSettled, useItemStatusClassName } from "@/features/plan-status";
import { PlanContext } from "@/features/plan-timeline/context";
import { PlanItemNode } from "@/features/plan-timeline/model";
import { useDragSession } from "@/lib/dnd/drag-session";
import clsx from "clsx";
import { DateChip } from "./chips";
import { PlanItemLine } from "./line";

type DrawerRowProps = {
  node: PlanItemNode;
  /** Whether I'm one of a section's own items, which stay put. */
  sectionRoot?: boolean;
  /** Whether my section's own items come from more than one plan. */
  spansPlans?: boolean;
  recognizeIngredients?: boolean;
  context: PlanContext;
  /** Left out, nothing can be dropped on me. */
  tree?: PlanTree;
  onMove?: (move: TreeMove, name: string) => void;
};

/**
 * I am one item's line in the item screen: it can be nested under, or put
 * before or after, by a drag from elsewhere in my own plan. As one of a
 * section's own items I stay put and only take what nests under me. When
 * my item sits apart from its parent, I say which day it has been moved to.
 */
export function DrawerRow({
  node,
  sectionRoot = false,
  spansPlans = false,
  recognizeIngredients = false,
  context,
  tree,
  onMove,
}: DrawerRowProps) {
  const { dragged } = useDragSession();
  const { id, name } = node.item;
  const planOf = useItemPlanLookup();
  const plan = planOf(id);
  const zones =
    dragged && tree && onMove && planOf(dragged.id) === plan
      ? treeZones({
          tree,
          dragged,
          target: { id, name },
          rects: sectionRoot ? { child: TREE_ZONES.child } : TREE_ZONES,
          onMove: (move) => onMove(move, dragged.name),
        })
      : [];
  const showsPlan = sectionRoot && spansPlans && plan !== undefined;
  const handle = !sectionRoot
    ? undefined
    : showsPlan
      ? "placeholder"
      : "disabled";

  const statusClassName = useItemStatusClassName(id);
  const settled = useItemSettled(id);
  const isIngredient = recognizeIngredients && node.item.children.length === 0;
  const highlightIngredient = isIngredient && settled;
  // A section's own item is there by its own bucket, so a new item beside
  // it takes that bucket to stay in the section.
  const bucketId =
    sectionRoot && node.item.bucket !== null ? node.item.bucket.id : undefined;
  const own = context.get(id);
  // My own day is what the item screen cannot otherwise show: nothing here
  // stands under a date the way a timeline row does.
  const apartOn =
    own && own.separation !== null && own.date !== null ? own.date : null;

  return (
    <PlanItemLine
      node={node}
      zones={zones}
      handle={handle}
      showsPlan={showsPlan}
      chips={
        apartOn !== null ? (
          <DateChip date={apartOn} separation={own?.separation} />
        ) : null
      }
    >
      {plan !== undefined ? (
        <EditableName
          itemId={id}
          planId={plan.id}
          name={name}
          hasChildren={node.item.children.length > 0}
          canEdit={plan.changeable && settled}
          recognizeIngredient={isIngredient}
          bucketId={bucketId}
          className={statusClassName}
        >
          <PlanItem
            item={node.item}
            highlightIngredient={highlightIngredient}
          />
        </EditableName>
      ) : (
        <span className={clsx("min-w-0", statusClassName)}>
          <PlanItem
            item={node.item}
            highlightIngredient={highlightIngredient}
          />
        </span>
      )}
    </PlanItemLine>
  );
}
