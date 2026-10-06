import { PlanItemStatus } from "@/__generated__/graphql";
import { ControlTooltip } from "@/components/control-tooltip";
import { usePageEngine } from "@/features/page-engine";
import {
  actionLabel,
  isToggleStatus,
  TOGGLE_LOOKS,
  useItemStatus,
} from "@/features/plan-status/status";
import { Button } from "@heroui/react";
import clsx from "clsx";

type Props = {
  itemId: string;
  planId: string;
  canChange: boolean;
};

/** Preparation uses the planner's acquired status and keeps the recipe in its plan. */
export function PreppedButton({ itemId, planId, canChange }: Props) {
  const engine = usePageEngine();
  const item = useItemStatus(itemId);
  if (item === null || !isToggleStatus(item.status)) return null;

  const prepped = item.status === PlanItemStatus.ACQUIRED;
  const look = TOGGLE_LOOKS[item.status];
  if (!canChange) {
    return (
      <span className={clsx("text-sm", look.className)}>
        {prepped ? "Prepped" : "Needs prep"}
      </span>
    );
  }

  return (
    <ControlTooltip label={prepped ? "Undo prep" : "Mark as prepped"}>
      <Button
        aria-label={actionLabel(
          prepped ? "Prepped. Undo prep" : "I prepped this",
          item.name,
        )}
        aria-pressed={prepped}
        variant="tertiary"
        className={clsx(look.className, look.buttonClassName)}
        isDisabled={item.inert || item.pendingStatus !== null}
        onPress={() =>
          engine.set([
            {
              kind: "status",
              id: itemId,
              planId,
              name: item.name,
              status: prepped ? PlanItemStatus.NEEDED : PlanItemStatus.ACQUIRED,
            },
          ])
        }
      >
        {prepped ? "Prepped" : "I prepped this"}
      </Button>
    </ControlTooltip>
  );
}
