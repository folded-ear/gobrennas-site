import { PlanItem } from "@/features/plan-item";
import { PlanItemNode } from "@/features/plan-timeline/model";
import { ReactNode } from "react";

type PlanItemTreeProps = {
  nodes: readonly PlanItemNode[];
  onSelect?: (id: string) => void;
  /** Draws one item's own line. Left out, I show the plain item. */
  renderItem?: (node: PlanItemNode) => ReactNode;
};

/** I show a list of plan items, each above its own descendants. */
export function PlanItemTree({
  nodes,
  onSelect,
  renderItem,
}: PlanItemTreeProps) {
  if (nodes.length === 0) return null;

  return (
    <ul className="flex flex-col gap-xxs">
      {nodes.map((node) => (
        <li key={node.item.id}>
          {renderItem ? (
            renderItem(node)
          ) : (
            <PlanItem item={node.item} onSelect={onSelect} />
          )}
          {node.children.length > 0 ? (
            <div className="ps-md">
              <PlanItemTree
                nodes={node.children}
                onSelect={onSelect}
                renderItem={renderItem}
              />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
