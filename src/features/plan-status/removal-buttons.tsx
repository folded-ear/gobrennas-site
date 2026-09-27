"use client";

import { PlanItemStatus } from "@/__generated__/graphql";
import { ControlTooltip } from "@/components/control-tooltip";
import { CookedItIcon, DeleteIcon } from "@/components/icons";
import { Button } from "@heroui/react";
import clsx from "clsx";
import {
  actionLabel,
  LINE_CONTROL_CLASS_NAME,
  REMOVAL_LOOKS,
  RemovalStatus,
  useItemStatus,
} from "./status";
import { usePlanStatus } from "./use-plan-status";

type RemovalButtonProps = {
  readonly itemId: string;
  readonly planId: string;
};

type CancelPendingButtonProps = {
  readonly itemId: string;
  readonly status: RemovalStatus;
};

/**
 * I cancel an item's held removal, and show nothing unless it's the one
 * held. Once it's being sent, I show that it can no longer be cancelled.
 */
export function CancelPendingButton({
  itemId,
  status,
}: CancelPendingButtonProps) {
  const queue = usePlanStatus();
  const item = useItemStatus(itemId);
  if (item?.pendingStatus !== status) return null;

  const look = REMOVAL_LOOKS[status];
  return (
    <Button
      aria-label={actionLabel(look.undo, item.name)}
      className={clsx("h-xl shrink-0", look.pendingClassName)}
      isPending={item.savingStatus}
      onPress={() => queue.cancel(itemId)}
      size="sm"
    >
      {look.undo}
    </Button>
  );
}

/** I delete an item, after a window in which it can be undone. */
export function DeleteButton({ itemId, planId }: RemovalButtonProps) {
  const queue = usePlanStatus();
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
        className={clsx(LINE_CONTROL_CLASS_NAME, "text-status-deleted")}
        isDisabled={item.inert || item.pendingStatus !== null}
        isIconOnly
        onPress={() =>
          queue.hold({
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
  const queue = usePlanStatus();
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
      className="border-status-completed text-status-completed"
      isDisabled={item.inert || item.pendingStatus !== null}
      onPress={() => {
        queue.hold({
          id: itemId,
          planId,
          name: item.name,
          status: PlanItemStatus.COMPLETED,
        });
        onCooked?.();
      }}
      variant="outline"
    >
      <CookedItIcon size="small" aria-hidden="true" />
      {look.action}
    </Button>
  );
}
