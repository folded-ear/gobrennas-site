"use client";

import { PlanDot } from "@/components/plan-dot";
import { useItemPlan, useShowsPlanIndicators } from "@/features/plan-directory";
import { PlanDnd } from "@/features/plan-dnd";
import { useDragSession } from "@/features/plan-dnd/drag-session";
import { ItemRow } from "@/features/plan-dnd/item-row";
import { treeZones } from "@/features/plan-dnd/tree-zones";
import { REORDER_ZONES } from "@/features/plan-dnd/zones";
import { PlanItem } from "@/features/plan-item";
import { DateChip, ParentChip } from "@/features/plan-item/chips";
import { CookLink } from "@/features/plan-item/cook-link";
import clsx from "clsx";
import { PlanContext } from "./context";
import { PlanItemNode } from "./model";

/** A plan's moves, plus what the timeline knows of where items show. */
export type TimelineDnd = PlanDnd & {
  readonly rootIds: ReadonlySet<string>;
  readonly sectionOf: ReadonlyMap<string, string>;
};

type TimelineRowProps = {
  node: PlanItemNode;
  sectionKey: string;
  /** Whether I head my section's tree rather than nest under my parent. */
  sectionRoot: boolean;
  context: PlanContext;
  /** The item open in its screen, marked wherever it shows. */
  openId?: string;
  /** Left out, nothing can be dragged. */
  dnd?: TimelineDnd;
  onSelect?: (id: string) => void;
  /** Left out, no item offers to be cooked. */
  planId?: string;
};

/**
 * I am one item's line on the timeline. When I'm top-level, another
 * top-level item in my section can be put before or after me. When my item
 * sits in another section from its parent, I say what it is part of, and
 * when that is if it's another day.
 */
export function TimelineRow({
  node,
  sectionKey,
  sectionRoot,
  context,
  openId,
  dnd,
  onSelect,
  planId,
}: TimelineRowProps) {
  const { dragged } = useDragSession();
  const { id, name } = node.item;
  const reorderable =
    dnd !== undefined &&
    dragged !== null &&
    dnd.rootIds.has(id) &&
    dnd.rootIds.has(dragged.id) &&
    dnd.sectionOf.get(dragged.id) === sectionKey;
  const zones =
    reorderable && dragged !== null
      ? treeZones({
          tree: dnd.tree,
          dragged,
          target: { id, name },
          rects: REORDER_ZONES,
          onMove: (move) => dnd.moves.moveInTree(move, dragged.name),
        })
      : [];

  const plan = useItemPlan(id);
  const showsPlan = useShowsPlanIndicators();

  const own = context.get(id);
  const apart = sectionRoot && own !== undefined ? own : null;

  return (
    <div
      className={clsx(
        // The bars hang outside on a margin matching their width, so a row
        // neither pays for them nor shifts when it gets them.
        openId === id && "-mx-0.5 border-x-2 border-accent",
      )}
    >
      <ItemRow itemId={id} name={name} zones={zones}>
        {sectionRoot && showsPlan && plan ? (
          <PlanDot plan={plan} className="me-xxs" />
        ) : null}
        <PlanItem item={node.item} onSelect={onSelect} />
        {openId === id ? (
          // The bars say this to everyone who can see them.
          <span className="sr-only">, open in its screen</span>
        ) : null}
        {planId !== undefined && node.item.children.length > 0 ? (
          <CookLink planId={planId} itemId={id} name={name} />
        ) : null}
        {apart?.parent ? (
          <span className="ms-auto flex items-center gap-xs">
            <ParentChip name={apart.parent.name} />
            {apart.parent.date !== null && apart.separation !== null ? (
              <DateChip
                date={apart.parent.date}
                separation={apart.separation}
              />
            ) : null}
          </span>
        ) : null}
      </ItemRow>
    </div>
  );
}
