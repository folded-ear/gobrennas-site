import { PlanDnd } from "@/features/plan-dnd";
import { DragSession } from "@/features/plan-dnd/drag-session";
import { PlanItemNode } from "@/features/plan-timeline/model";
import { FragmentType } from "@apollo/client";
import { useFragment } from "@apollo/client/react";
import {
  PlanItemFragment,
  PlanItemFragmentDoc,
} from "./__generated__/planItem.generated";
import { DrawerRow } from "./drawer-row";
import { PlanItemTree } from "./tree";

const DRAWER_DRAG_TYPE = "application/x.gobrennas.drawer-item";

type PlanItemDetailProps = {
  item: FragmentType<PlanItemFragment>;
  /** Everything below the item, however deep and whatever its dates. */
  descendants: readonly PlanItemNode[];
  onSelect?: (id: string) => void;
  /** Left out, nothing can be dragged. */
  dnd?: PlanDnd;
};

export function PlanItemDetail({
  item,
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

  return (
    <div className="flex flex-col gap-sm">
      <h2 className="text-xl font-semibold text-foreground">{data.name}</h2>
      {data.notes ? <p className="text-sm text-muted">{data.notes}</p> : null}
      {dnd ? (
        <DragSession
          dragType={DRAWER_DRAG_TYPE}
          canMove={dnd.canMove}
          isMoving={dnd.moves.isMoving}
        >
          <PlanItemTree
            nodes={descendants}
            renderItem={(node) => (
              <DrawerRow
                node={node}
                tree={dnd.tree}
                onMove={dnd.moves.moveInTree}
                onSelect={onSelect}
              />
            )}
          />
        </DragSession>
      ) : (
        <PlanItemTree nodes={descendants} onSelect={onSelect} />
      )}
    </div>
  );
}
