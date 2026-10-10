import { Draft, TreeEntry } from "@/features/plan-edit";
import { PlanItemNode } from "@/features/plan-timeline/model";
import { ReactNode } from "react";

type PlanItemTreeProps = {
  entries: readonly TreeEntry[];
  /** Draws one item's own line. */
  renderItem: (node: PlanItemNode) => ReactNode;
  /** Draws a new item's line. Left out, new items don't show. */
  renderDraft?: (draft: Draft) => ReactNode;
};

/** I show a list of plan items and new ones, each above its own rows. */
export function PlanItemTree({
  entries,
  renderItem,
  renderDraft,
}: PlanItemTreeProps) {
  if (entries.length === 0) return null;

  return (
    // Rows pad themselves rather than the list gapping them, so their drop
    // zones meet.
    <ul className="flex flex-col">
      {entries.map((entry) =>
        entry.kind === "item" ? (
          <li key={entry.node.item.id}>
            {renderItem(entry.node)}
            {entry.children.length > 0 ? (
              <div className="ps-md">
                <PlanItemTree
                  entries={entry.children}
                  renderItem={renderItem}
                  renderDraft={renderDraft}
                />
              </div>
            ) : null}
          </li>
        ) : renderDraft ? (
          <li key={entry.draft.draftId} className="py-px">
            {renderDraft(entry.draft)}
          </li>
        ) : null,
      )}
    </ul>
  );
}
