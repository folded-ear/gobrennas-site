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

type PlanItemDetailProps = {
  item: FragmentType<PlanItemFragment>;
  /** Where every item in the plan sits, for the walk down to this one. */
  context: PlanContext;
  /** Everything below the item, however deep and whatever its dates. */
  descendants: readonly PlanItemNode[];
  /** Opens one of the item's ancestors. Left out, none of them open. */
  onSelect?: (id: string) => void;
  /** Left out, nothing can be dragged. */
  dnd?: PlanDnd;
};

export function PlanItemDetail({
  item,
  context,
  descendants,
  onSelect,
  dnd,
}: PlanItemDetailProps) {
  const { data, complete } = useFragment({
    fragment: PlanItemFragmentDoc,
    fragmentName: "planItem",
    from: item,
  });

  if (!complete) return null;

  // One way of drawing a row, whether or not the plan can be changed:
  // a row says where its item has been moved to either way.
  const tree = (
    <PlanItemTree
      nodes={descendants}
      renderItem={(node) => (
        <DrawerRow
          node={node}
          context={context}
          tree={dnd?.tree}
          onMove={dnd?.moves.moveInTree}
        />
      )}
    />
  );

  return (
    <div className="flex flex-col gap-sm">
      <Ladder context={context} id={data.id} onSelect={onSelect} />
      {data.notes ? <p className="text-sm text-muted">{data.notes}</p> : null}
      {descendants.length > 0 ? (
        // Where the item's own context stops and its contents start.
        <hr className="border-separator" />
      ) : null}
      {dnd ? (
        <DragSession
          dragType={DRAWER_DRAG_TYPE}
          canMove={dnd.canMove}
          isMoving={dnd.moves.isMoving}
        >
          {tree}
        </DragSession>
      ) : (
        tree
      )}
    </div>
  );
}
