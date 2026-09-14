import { useItemPlanLookup } from "@/features/plan-directory";
import { PlanDnd } from "@/features/plan-dnd";
import { DragSession } from "@/features/plan-dnd/drag-session";
import { PlanContext } from "@/features/plan-timeline/context";
import { PlanItemNode } from "@/features/plan-timeline/model";
import { FragmentType } from "@apollo/client";
import { useFragment } from "@apollo/client/react";
import {
  PlanItemFragment,
  PlanItemFragmentDoc,
} from "./__generated__/planItem.generated";
import { DrawerRow } from "./drawer-row";
import { Ladder } from "./ladder";
import { PlanItemTree } from "./tree";

const DRAWER_DRAG_TYPE = "application/x.gobrennas.drawer-item";

type PlanItemHeaderProps = {
  item: FragmentType<PlanItemFragment>;
  /** Where every item in the plan sits, for the walk down to this one. */
  context: PlanContext;
  /** Whether anything sits below the item. */
  hasDescendants: boolean;
  /** Opens one of the item's ancestors. Left out, none of them open. */
  onSelect?: (id: string) => void;
};

/**
 * I head an open item's screen: the walk down to it, its notes, and a rule
 * before whatever sits below it.
 */
export function PlanItemHeader({
  item,
  context,
  hasDescendants,
  onSelect,
}: PlanItemHeaderProps) {
  const { data, complete } = useFragment({
    fragment: PlanItemFragmentDoc,
    fragmentName: "planItem",
    from: item,
  });

  if (!complete) return null;

  return (
    <div className="flex flex-col gap-sm pb-sm">
      <Ladder
        context={context}
        id={data.id}
        onSelect={onSelect}
        openHasChildren={hasDescendants}
      />
      {data.notes ? <p className="text-sm text-muted">{data.notes}</p> : null}
      {hasDescendants ? (
        // Where the item's own context stops and its contents start.
        <hr className="border-separator" />
      ) : null}
    </div>
  );
}

type PlanItemDetailProps = {
  /** Where every item in the plans sits. */
  context: PlanContext;
  /** Everything I show, however deep and whatever its dates. */
  descendants: readonly PlanItemNode[];
  /** Left out, nothing can be dragged. */
  dnd?: PlanDnd;
  /**
   * Whether my top-level rows are a section's own items, which stay where
   * the timeline puts them.
   */
  holdsSection?: boolean;
};

/**
 * I show everything below an open item, or everything in an open section,
 * however deep.
 */
export function PlanItemDetail({
  context,
  descendants,
  dnd,
  holdsSection = false,
}: PlanItemDetailProps) {
  const planOf = useItemPlanLookup();
  const spansPlans =
    holdsSection &&
    new Set(descendants.map((root) => planOf(root.item.id))).size > 1;

  // One way of drawing a row, whether or not the plan can be changed:
  // a row says where its item has been moved to either way.
  const rows = (
    <PlanItemTree
      nodes={descendants}
      renderItem={(node) => (
        <DrawerRow
          node={node}
          sectionRoot={holdsSection && descendants.includes(node)}
          spansPlans={spansPlans}
          context={context}
          tree={dnd?.tree}
          onMove={dnd?.moves.moveInTree}
        />
      )}
    />
  );

  return dnd ? (
    <DragSession
      dragType={DRAWER_DRAG_TYPE}
      canMove={dnd.canMove}
      isMoving={dnd.moves.isMoving}
    >
      {rows}
    </DragSession>
  ) : (
    rows
  );
}
