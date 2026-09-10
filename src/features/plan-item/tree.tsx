import { PlanItem } from "@/features/plan-item";
import { PlanItemNode } from "@/features/plan-timeline/model";

type PlanItemTreeProps = {
  nodes: readonly PlanItemNode[];
  onSelect?: (id: string) => void;
};

/** I show a list of plan items, each above its own descendants. */
export function PlanItemTree({ nodes, onSelect }: PlanItemTreeProps) {
  if (nodes.length === 0) return null;

  return (
    <ul className="flex flex-col gap-xxs">
      {nodes.map((node) => (
        <li key={node.item.id}>
          <PlanItem item={node.item} onSelect={onSelect} />
          {node.children.length > 0 ? (
            <div className="ps-md">
              <PlanItemTree nodes={node.children} onSelect={onSelect} />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
