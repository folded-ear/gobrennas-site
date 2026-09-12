import { PlanItemNode } from "@/features/plan-timeline/model";
import { ReactNode } from "react";

type PlanItemTreeProps = {
  nodes: readonly PlanItemNode[];
  /** Draws one item's own line. */
  renderItem: (node: PlanItemNode) => ReactNode;
};

/** I show a list of plan items, each above its own descendants. */
export function PlanItemTree({ nodes, renderItem }: PlanItemTreeProps) {
  if (nodes.length === 0) return null;

  return (
    <ul className="flex flex-col gap-xxs">
      {nodes.map((node) => (
        <li key={node.item.id}>
          {renderItem(node)}
          {node.children.length > 0 ? (
            <div className="ps-md">
              <PlanItemTree nodes={node.children} renderItem={renderItem} />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
