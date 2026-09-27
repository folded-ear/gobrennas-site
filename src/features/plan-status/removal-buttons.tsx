"use client";

import { PlanItemStatus } from "@/__generated__/graphql";
import { CookedItIcon, DeleteIcon, IconProps } from "@/components/icons";
import { Button, Tooltip } from "@heroui/react";
import { ComponentType } from "react";
import {
  actionLabel,
  REMOVAL_LOOKS,
  RemovalStatus,
  useItemStatus,
} from "./status";
import { usePlanStatus } from "./use-plan-status";

type RemovalButtonProps = {
  readonly itemId: string;
  readonly planId: string;
};

type RemovalProps = RemovalButtonProps & {
  readonly status: RemovalStatus;
  readonly Icon: ComponentType<IconProps>;
  readonly className: string;
  readonly onHeld?: () => void;
};

/**
 * I ask for an item's removal, then stand in for myself with a way to
 * cancel it until it's sent.
 */
function RemovalButton({
  itemId,
  planId,
  status,
  Icon,
  className,
  onHeld,
}: RemovalProps) {
  const queue = usePlanStatus();
  const item = useItemStatus(itemId);
  if (item === null) return null;

  const look = REMOVAL_LOOKS[status];
  if (item.pendingStatus === status) {
    return (
      <Button
        aria-label={actionLabel(look.undo, item.name)}
        className={look.pendingClassName}
        // Once it's being sent, it can no longer be cancelled.
        isPending={item.savingStatus}
        onPress={() => queue.cancel(itemId)}
        size="sm"
      >
        {look.undo}
      </Button>
    );
  }
  return (
    <Tooltip delay={0}>
      <Button
        aria-label={actionLabel(look.action, item.name)}
        className={className}
        isDisabled={item.inert || item.pendingStatus !== null}
        isIconOnly
        onPress={() => {
          queue.hold({ id: itemId, planId, name: item.name, status });
          onHeld?.();
        }}
        size="sm"
        variant="ghost"
      >
        <Icon size="small" aria-hidden="true" />
      </Button>
      <Tooltip.Content>
        <p>{look.action}</p>
      </Tooltip.Content>
    </Tooltip>
  );
}

/** I delete an item, after a window in which it can be undone. */
export function DeleteButton(props: RemovalButtonProps) {
  return (
    <RemovalButton
      {...props}
      status={PlanItemStatus.DELETED}
      Icon={DeleteIcon}
      className="text-status-deleted"
    />
  );
}

type CookedItButtonProps = RemovalButtonProps & {
  /** Called once the item is marked cooked. */
  readonly onCooked?: () => void;
};

/** I mark an item cooked, after a window in which it can be undone. */
export function CookedItButton({ onCooked, ...props }: CookedItButtonProps) {
  return (
    <RemovalButton
      {...props}
      status={PlanItemStatus.COMPLETED}
      Icon={CookedItIcon}
      className="text-status-completed"
      onHeld={onCooked}
    />
  );
}
