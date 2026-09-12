"use client";

import { PlanDnd } from "@/features/plan-dnd";
import { useDragSession } from "@/features/plan-dnd/drag-session";
import { ItemRow } from "@/features/plan-dnd/item-row";
import { treeZones } from "@/features/plan-dnd/tree-zones";
import { REORDER_ZONES } from "@/features/plan-dnd/zones";
import { PlanItem } from "@/features/plan-item";
import { DateChip, ParentChip } from "@/features/plan-item/chips";
import clsx from "clsx";
import { PlanContext } from "./context";
import { PlanItemNode } from "./model";

/** A plan's moves, plus what the timeline knows of where items show. */
export type TimelineDnd = PlanDnd & {
  readonly rootIds: ReadonlySet<string>;
  readonly dayOf: ReadonlyMap<string, string>;
};

type TimelineRowProps = {
  node: PlanItemNode;
  date: string;
  context: PlanContext;
  /** The item open in the drawer, marked wherever it shows. */
  openId?: string;
  /** Left out, nothing can be dragged. */
  dnd?: TimelineDnd;
  onSelect?: (id: string) => void;
};

/**
 * I am one item's line on the timeline. When I'm top-level, another
 * top-level item on my day can be put before or after me. When my item
 * sits apart from its parent, I say what it is part of and when that is.
 */
export function TimelineRow({
  node,
  date,
  context,
  openId,
  dnd,
  onSelect,
}: TimelineRowProps) {
  const { dragged } = useDragSession();
  const { id, name } = node.item;
  const reorderable =
    dnd !== undefined &&
    dragged !== null &&
    dnd.rootIds.has(id) &&
    dnd.rootIds.has(dragged.id) &&
    dnd.dayOf.get(dragged.id) === date;
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

  const own = context.get(id);
  const apart = own?.separation != null ? own : null;

  return (
    <div
      className={clsx(
        // Unopened rows keep the width, or opening one shifts it.
        "border-x-2",
        openId === id ? "border-accent" : "border-transparent",
      )}
    >
      <ItemRow itemId={id} name={name} zones={zones}>
        <PlanItem item={node.item} onSelect={onSelect} />
        {openId === id ? (
          // The tint says this to everyone who can see it.
          <span className="sr-only">, open in the drawer</span>
        ) : null}
        {apart?.parent ? (
          <span className="ms-auto flex items-center gap-xs">
            <ParentChip name={apart.parent.name} />
            {apart.parent.date !== null ? (
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
