import { PlanItemStatus } from "@/__generated__/graphql";
import { ControlTooltip } from "@/components/control-tooltip";
import { usePageEngine } from "@/features/page-engine";
import {
  actionLabel,
  isToggleStatus,
  useItemStatus,
} from "@/features/plan-status/status";
import { Button } from "@heroui/react";

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
  if (!canChange) {
    return (
      <span className="text-sm text-muted">
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
