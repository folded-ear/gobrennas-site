import { PlanItemStatus } from "@/__generated__/graphql";
import { useFragment } from "@apollo/client/react";
import { PlanItemStatusFragmentDoc } from "./__generated__/planItemStatus.generated";

/** A status an item can be switched to and from. */
export type ToggleStatus = PlanItemStatus.NEEDED | PlanItemStatus.ACQUIRED;

/** A status that removes an item from its plan. */
export type RemovalStatus = PlanItemStatus.COMPLETED | PlanItemStatus.DELETED;

type ToggleLook = {
  /** What the status is called. */
  readonly name: string;
  /** What switching away from it is called. */
  readonly action: string;
  readonly next: ToggleStatus;
  readonly className: string;
};

export const TOGGLE_LOOKS: Record<ToggleStatus, ToggleLook> = {
  [PlanItemStatus.NEEDED]: {
    name: "Needed",
    action: "Mark acquired",
    next: PlanItemStatus.ACQUIRED,
    className: "text-muted",
  },
  [PlanItemStatus.ACQUIRED]: {
    name: "Acquired",
    action: "Mark needed",
    next: PlanItemStatus.NEEDED,
    className: "text-status-acquired",
  },
};

type RemovalLook = {
  /** What asking for the removal is called. */
  readonly action: string;
  /** What cancelling it is called. */
  readonly undo: string;
  /** How the removal looks while it can still be cancelled. */
  readonly pendingClassName: string;
};

export const REMOVAL_LOOKS: Record<RemovalStatus, RemovalLook> = {
  [PlanItemStatus.COMPLETED]: {
    action: "I cooked it",
    undo: "Undo cooked",
    pendingClassName: "bg-status-completed text-status-completed-foreground",
  },
  [PlanItemStatus.DELETED]: {
    action: "Delete",
    undo: "Undo delete",
    pendingClassName: "bg-status-deleted text-status-deleted-foreground",
  },
};

/** I name an action on one item, for anyone who can't see its row. */
export function actionLabel(action: string, itemName: string) {
  return `${action}: ${itemName}`;
}

/** I give an item's status and what's being done to it, as it changes. */
export function useItemStatus(itemId: string) {
  const { data, complete } = useFragment({
    fragment: PlanItemStatusFragmentDoc,
    from: { __typename: "PlanItem", id: itemId },
  });
  return complete ? data : null;
}

/** I tell whether a status is one an item is switched to and from. */
export function isToggleStatus(status: PlanItemStatus): status is ToggleStatus {
  return status === PlanItemStatus.NEEDED || status === PlanItemStatus.ACQUIRED;
}
