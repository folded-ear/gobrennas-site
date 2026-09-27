"use client";

import { ControlTooltip } from "@/components/control-tooltip";
import { StatusIcon } from "@/components/icons";
import { Button } from "@heroui/react";
import clsx from "clsx";
import {
  actionLabel,
  isToggleStatus,
  LINE_CONTROL_CLASS_NAME,
  TOGGLE_LOOKS,
  ToggleStatus,
  useItemStatus,
} from "./status";
import { usePlanStatus } from "./use-plan-status";

type StatusButtonProps = {
  readonly itemId: string;
  readonly planId: string;
  /** Whether the viewer may change the item's plan. */
  readonly canChange: boolean;
};

/**
 * I show whether an item is needed or acquired, and switch it between
 * the two when the viewer may change it.
 */
export function StatusButton({ itemId, planId, canChange }: StatusButtonProps) {
  const queue = usePlanStatus();
  const item = useItemStatus(itemId);
  if (item === null || !isToggleStatus(item.status)) return null;

  const look = TOGGLE_LOOKS[item.status];
  return (
    <ToggleButton
      status={item.status}
      label={actionLabel(look.action, item.name)}
      canChange={canChange}
      isDisabled={item.inert || item.pendingStatus !== null}
      isPending={item.savingStatus}
      onPress={() =>
        queue.set([{ id: itemId, planId, name: item.name, status: look.next }])
      }
    />
  );
}

type ToggleButtonProps = {
  readonly status: ToggleStatus;
  /** What pressing me does, and to what. */
  readonly label: string;
  readonly canChange: boolean;
  readonly isDisabled: boolean;
  readonly isPending: boolean;
  readonly onPress: () => void;
};

/**
 * I am the check a status is shown with: a button switching it, or just
 * the status for a viewer who can't change it.
 */
export function ToggleButton({
  status,
  label,
  canChange,
  isDisabled,
  isPending,
  onPress,
}: ToggleButtonProps) {
  const look = TOGGLE_LOOKS[status];
  if (!canChange) {
    return (
      <span
        role="img"
        aria-label={look.name}
        className={clsx(
          "flex items-center justify-center",
          LINE_CONTROL_CLASS_NAME,
          look.className,
        )}
      >
        <StatusIcon size="small" aria-hidden="true" />
      </span>
    );
  }
  return (
    <ControlTooltip label={look.action}>
      <Button
        aria-label={label}
        className={clsx(LINE_CONTROL_CLASS_NAME, look.className)}
        isDisabled={isDisabled}
        isIconOnly
        isPending={isPending}
        onPress={onPress}
        size="sm"
        variant="ghost"
      >
        <StatusIcon size="small" aria-hidden="true" />
      </Button>
    </ControlTooltip>
  );
}
