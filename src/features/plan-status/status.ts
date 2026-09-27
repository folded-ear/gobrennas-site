import { PlanItemStatus } from "@/__generated__/graphql";
import { AcquiredIcon, IconProps, NeededIcon } from "@/components/icons";
import { useFragment } from "@apollo/client/react";
import { ComponentType } from "react";
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
  /** What the status looks like, whatever pressing it would do. */
  readonly Icon: ComponentType<IconProps>;
  readonly className: string;
  /** How a button switching away from it looks: filled with where it goes. */
  readonly buttonClassName: string;
};

export const TOGGLE_LOOKS: Record<ToggleStatus, ToggleLook> = {
  [PlanItemStatus.NEEDED]: {
    name: "Needed",
    action: "Mark acquired",
    next: PlanItemStatus.ACQUIRED,
    Icon: NeededIcon,
    className: "text-status-needed",
    buttonClassName:
      "data-hovered:bg-status-acquired data-hovered:text-status-acquired-foreground data-focus-visible:bg-status-acquired data-focus-visible:text-status-acquired-foreground",
  },
  [PlanItemStatus.ACQUIRED]: {
    name: "Acquired",
    action: "Mark needed",
    next: PlanItemStatus.NEEDED,
    Icon: AcquiredIcon,
    className: "text-status-acquired",
    buttonClassName:
      "data-hovered:bg-status-needed-fill data-hovered:text-status-needed-fill-foreground data-focus-visible:bg-status-needed-fill data-focus-visible:text-status-needed-fill-foreground",
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

/**
 * The box every control on an item's line takes: one line of text tall,
 * so controls, dots, and names all sit on the same line.
 */
export const LINE_CONTROL_CLASS_NAME = "size-xl min-w-0 shrink-0 p-0";

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

/**
 * I give the classes an item's name takes: struck through while it's
 * going away, faded while an ancestor is.
 */
export function useItemStatusClassName(itemId: string): string | undefined {
  const item = useItemStatus(itemId);
  if (item?.pendingStatus === PlanItemStatus.DELETED) {
    return "text-status-deleted line-through";
  }
  if (item?.pendingStatus === PlanItemStatus.COMPLETED) {
    return "text-status-completed line-through";
  }
  if (item?.inert) return "opacity-50";
  return undefined;
}
