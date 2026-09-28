import { Draft, TreeEntry } from "@/features/plan-edit";
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

type PlanItemEntryTreeProps = {
  entries: readonly TreeEntry[];
  /** Draws one item's own line. */
  renderItem: (node: PlanItemNode) => ReactNode;
  /** Draws a new item's line. */
  renderDraft: (draft: Draft) => ReactNode;
};

/** I show a list of plan items and new ones, each above its own rows. */
export function PlanItemEntryTree({
  entries,
  renderItem,
  renderDraft,
}: PlanItemEntryTreeProps) {
  if (entries.length === 0) return null;

  return (
    <ul className="flex flex-col gap-xxs">
      {entries.map((entry) =>
        entry.kind === "draft" ? (
          <li key={entry.draft.draftId}>{renderDraft(entry.draft)}</li>
        ) : (
          <li key={entry.node.item.id}>
            {renderItem(entry.node)}
            {entry.children.length > 0 ? (
              <div className="ps-md">
                <PlanItemEntryTree
                  entries={entry.children}
                  renderItem={renderItem}
                  renderDraft={renderDraft}
                />
              </div>
            ) : null}
          </li>
        ),
      )}
    </ul>
  );
}
