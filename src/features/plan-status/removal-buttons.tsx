"use client";

import { PlanItemStatus } from "@/__generated__/graphql";
import { ControlTooltip } from "@/components/control-tooltip";
import { CookedItIcon, DeleteIcon } from "@/components/icons";
import { usePlanSync } from "@/features/plan-sync";
import { Button } from "@heroui/react";
import clsx from "clsx";
import {
  actionLabel,
  LINE_CONTROL_CLASS_NAME,
  REMOVAL_LOOKS,
  RemovalStatus,
  useItemStatus,
} from "./status";

type RemovalButtonProps = {
  readonly itemId: string;
  readonly planId: string;
};

const CANCEL_TEXT = "Wait, no!";

type CancelPendingButtonProps = {
  readonly itemId: string;
  readonly status: RemovalStatus;
};

/**
 * I cancel an item's held removal, and show nothing unless it's the one
 * held.
 */
export function CancelPendingButton({
  itemId,
  status,
}: CancelPendingButtonProps) {
  const queue = usePlanSync();
  const item = useItemStatus(itemId);
  if (item?.pendingStatus !== status) return null;

  const look = REMOVAL_LOOKS[status];
  return (
    <Button
      // What it says leads what it's called, so it can be asked for by sight.
      aria-label={`${CANCEL_TEXT} ${actionLabel(look.undo, item.name)}`}
      className={clsx("h-xl shrink-0", look.pendingClassName)}
      onPress={() => queue.cancel(itemId)}
      size="sm"
    >
      {CANCEL_TEXT}
    </Button>
  );
}

/** I delete an item, after a window in which it can be undone. */
export function DeleteButton({ itemId, planId }: RemovalButtonProps) {
  const queue = usePlanSync();
  const item = useItemStatus(itemId);
  if (item === null) return null;
  if (item.pendingStatus === PlanItemStatus.DELETED) {
    return (
      <CancelPendingButton itemId={itemId} status={PlanItemStatus.DELETED} />
    );
  }

  const look = REMOVAL_LOOKS[PlanItemStatus.DELETED];
  return (
    <ControlTooltip label={look.action}>
      <Button
        aria-label={actionLabel(look.action, item.name)}
        className={clsx(
          LINE_CONTROL_CLASS_NAME,
          "text-status-deleted hover:bg-status-deleted hover:text-status-deleted-foreground",
        )}
        isDisabled={item.inert || item.pendingStatus !== null}
        isIconOnly
        onPress={() =>
          queue.hold({
            kind: "status",
            id: itemId,
            planId,
            name: item.name,
            status: PlanItemStatus.DELETED,
          })
        }
        size="sm"
        variant="ghost"
      >
        <DeleteIcon size="small" aria-hidden="true" />
      </Button>
    </ControlTooltip>
  );
}

type CookedItButtonProps = RemovalButtonProps & {
  /** Called once the item is marked cooked. */
  readonly onCooked?: () => void;
};

/** I mark an item cooked, after a window in which it can be undone. */
export function CookedItButton({
  itemId,
  planId,
  onCooked,
}: CookedItButtonProps) {
  const queue = usePlanSync();
  const item = useItemStatus(itemId);
  if (item === null) return null;
  if (item.pendingStatus === PlanItemStatus.COMPLETED) {
    return (
      <CancelPendingButton itemId={itemId} status={PlanItemStatus.COMPLETED} />
    );
  }

  const look = REMOVAL_LOOKS[PlanItemStatus.COMPLETED];
  return (
    <Button
      aria-label={actionLabel(look.action, item.name)}
      className="bg-status-completed text-status-completed-foreground"
      isDisabled={item.inert || item.pendingStatus !== null}
      onPress={() => {
        queue.hold({
          kind: "status",
          id: itemId,
          planId,
          name: item.name,
          status: PlanItemStatus.COMPLETED,
        });
        onCooked?.();
      }}
      variant="primary"
    >
      <CookedItIcon size="small" aria-hidden="true" />
      {look.action}
    </Button>
  );
}
