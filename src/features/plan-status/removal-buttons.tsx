"use client";

import { PlanItemStatus } from "@/__generated__/graphql";
import { ControlTooltip } from "@/components/control-tooltip";
import { CookedItIcon, DeleteIcon, MenuOpenIcon } from "@/components/icons";
import { usePageEngine } from "@/features/page-engine";
import { Button, Dropdown, Label } from "@heroui/react";
import clsx from "clsx";
import { useState } from "react";
import {
  actionLabel,
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
  const engine = usePageEngine();
  const item = useItemStatus(itemId);
  if (item?.pendingStatus !== status) return null;

  const look = REMOVAL_LOOKS[status];
  return (
    <Button
      // What it says leads what it's called, so it can be asked for by sight.
      aria-label={`${CANCEL_TEXT} ${actionLabel(look.undo, item.name)}`}
      className={clsx("shrink-0", look.pendingClassName)}
      onPress={() => engine.cancel(itemId)}
    >
      {CANCEL_TEXT}
    </Button>
  );
}

/** I delete an item, after a window in which it can be undone. */
export function DeleteButton({ itemId, planId }: RemovalButtonProps) {
  const engine = usePageEngine();
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
        className="text-status-deleted hover:bg-status-deleted hover:text-status-deleted-foreground"
        isDisabled={item.inert || item.pendingStatus !== null}
        isIconOnly
        onPress={() =>
          engine.hold({
            kind: "status",
            id: itemId,
            planId,
            name: item.name,
            status: PlanItemStatus.DELETED,
          })
        }
        variant="ghost"
      >
        <DeleteIcon aria-hidden="true" />
      </Button>
    </ControlTooltip>
  );
}

type CookedItButtonProps = RemovalButtonProps & {
  /** Called once the item is marked cooked. */
  readonly onCooked?: () => void;
};

const cookingDateFormat = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

/** I mark an item cooked, after a window in which it can be undone. */
export function CookedItButton({
  itemId,
  planId,
  onCooked,
}: CookedItButtonProps) {
  const engine = usePageEngine();
  const item = useItemStatus(itemId);
  const [dates, setDates] = useState<Date[]>([]);
  if (item === null) return null;
  if (item.pendingStatus === PlanItemStatus.COMPLETED) {
    return (
      <CancelPendingButton itemId={itemId} status={PlanItemStatus.COMPLETED} />
    );
  }

  const look = REMOVAL_LOOKS[PlanItemStatus.COMPLETED];
  const disabled = item.inert || item.pendingStatus !== null;
  const markCooked = (date: Date) => {
    engine.hold({
      kind: "status",
      id: itemId,
      planId,
      name: item.name,
      status: PlanItemStatus.COMPLETED,
      doneAt: date.toISOString(),
    });
    onCooked?.();
  };

  return (
    <div className="inline-flex shrink-0">
      <Button
        aria-label={actionLabel(look.action, item.name)}
        className="rounded-r-none bg-status-completed text-status-completed-foreground"
        isDisabled={disabled}
        onPress={() => markCooked(new Date())}
        variant="primary"
      >
        <CookedItIcon size="small" aria-hidden="true" />
        {look.action}
      </Button>
      <Dropdown
        onOpenChange={(open) => {
          if (!open) return;
          // Refresh on opening, even if Cook has been left open overnight.
          const today = new Date();
          setDates(
            Array.from({ length: 7 }, (_, daysAgo) => {
              const date = new Date(today);
              date.setDate(date.getDate() - daysAgo);
              return date;
            }),
          );
        }}
      >
        <Button
          aria-label={actionLabel("Choose cooking date", item.name)}
          className="rounded-l-none border-l border-status-completed-foreground/30 bg-status-completed text-status-completed-foreground"
          isDisabled={disabled}
          isIconOnly
          variant="primary"
        >
          <MenuOpenIcon size="small" aria-hidden="true" />
        </Button>
        <Dropdown.Popover>
          <Dropdown.Menu aria-label="Cooking date">
            {dates.map((date) => {
              const label = cookingDateFormat.format(date);
              return (
                <Dropdown.Item
                  key={date.toISOString()}
                  id={date.toISOString()}
                  isDisabled={disabled}
                  textValue={label}
                  onAction={() => markCooked(date)}
                >
                  <Label>{label}</Label>
                </Dropdown.Item>
              );
            })}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </div>
  );
}
