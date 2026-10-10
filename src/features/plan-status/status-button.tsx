"use client";

import { ControlTooltip } from "@/components/control-tooltip";
import { usePageEngine } from "@/features/page-engine";
import { Button } from "@heroui/react";
import clsx from "clsx";
import {
  actionLabel,
  countedLabel,
  isToggleStatus,
  TOGGLE_LOOKS,
  ToggleStatus,
  useItemStatus,
} from "./status";

type StatusButtonProps = {
  readonly itemId: string;
  readonly planId: string;
  /** Whether the viewer may change the item's plan. */
  readonly canChange: boolean;
  /** The status the item counts as, if not its own. */
  readonly countsAs?: ToggleStatus;
};

/**
 * I show whether an item is needed or acquired, and switch it between
 * the two when the viewer may change it.
 */
export function StatusButton({
  itemId,
  planId,
  canChange,
  countsAs,
}: StatusButtonProps) {
  const engine = usePageEngine();
  const item = useItemStatus(itemId);
  if (item === null || !isToggleStatus(item.status)) return null;

  const look = TOGGLE_LOOKS[item.status];
  return (
    <ToggleButton
      status={item.status}
      countsAs={countsAs}
      label={actionLabel(look.action, item.name)}
      canChange={canChange}
      isDisabled={item.inert || item.pendingStatus !== null}
      onPress={() =>
        engine.set([
          {
            kind: "status",
            id: itemId,
            planId,
            name: item.name,
            status: look.next,
          },
        ])
      }
    />
  );
}

type ToggleButtonProps = {
  readonly status: ToggleStatus;
  /** The status whose color I take, if not my own. */
  readonly countsAs?: ToggleStatus;
  /** What pressing me does, and to what. */
  readonly label: string;
  readonly canChange: boolean;
  readonly isDisabled: boolean;
  readonly onPress: () => void;
};

/**
 * I am the check a status is shown with: a button switching it, or just
 * the status for a viewer who can't change it.
 */
export function ToggleButton({
  status,
  countsAs = status,
  label,
  canChange,
  isDisabled,
  onPress,
}: ToggleButtonProps) {
  const look = TOGGLE_LOOKS[status];
  const color = TOGGLE_LOOKS[countsAs].className;
  if (!canChange) {
    return (
      <span
        role="img"
        aria-label={countedLabel(look.name, status, countsAs)}
        className={clsx("item-button", color)}
      >
        <look.Icon aria-hidden="true" />
      </span>
    );
  }
  return (
    <ControlTooltip label={look.action}>
      <Button
        aria-label={countedLabel(label, status, countsAs)}
        className={clsx(color, look.buttonClassName)}
        isDisabled={isDisabled}
        isIconOnly
        onPress={onPress}
        variant="ghost"
      >
        <look.Icon aria-hidden="true" />
      </Button>
    </ControlTooltip>
  );
}
