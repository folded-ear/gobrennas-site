"use client";

import { useFragment } from "@apollo/client/react";
import { PlanItemStatusFragmentDoc } from "./__generated__/planItemStatus.generated";
import { actionLabel, TOGGLE_LOOKS, ToggleStatus } from "./status";
import { ToggleButton } from "./status-button";
import { usePlanStatus } from "./use-plan-status";

/** One plan item behind a bulk status button. */
export type BulkItem = {
  readonly id: string;
  readonly planId: string;
};

type BulkStatusButtonProps = {
  readonly items: readonly BulkItem[];
  /** The status the items show as, together. */
  readonly status: ToggleStatus;
  /** What the items are, together. */
  readonly name: string;
  readonly canChange: boolean;
};

/** I switch several items between needed and acquired, together. */
export function BulkStatusButton({
  items,
  status,
  name,
  canChange,
}: BulkStatusButtonProps) {
  const queue = usePlanStatus();
  const { data } = useFragment({
    fragment: PlanItemStatusFragmentDoc,
    from: items.map((it) => ({ __typename: "PlanItem", id: it.id })),
  });
  const look = TOGGLE_LOOKS[status];

  return (
    <ToggleButton
      status={status}
      label={actionLabel(look.action, name)}
      canChange={canChange}
      isDisabled={false}
      isPending={data.some((it) => it?.savingStatus)}
      onPress={() =>
        queue.set(
          items.map((it, i) => ({
            id: it.id,
            planId: it.planId,
            name: data[i]?.name ?? name,
            status: look.next,
          })),
        )
      }
    />
  );
}
