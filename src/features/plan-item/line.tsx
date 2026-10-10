"use client";

import { PlanDot } from "@/components/plan-dot";
import { useItemPlan } from "@/features/plan-directory";
import { DeleteButton, StatusButton } from "@/features/plan-status";
import { PlanItemNode } from "@/features/plan-timeline/model";
import { ItemRow } from "@/lib/dnd/item-row";
import { ZoneSpec } from "@/lib/dnd/zone-layer";
import { ReactNode } from "react";
import { CookLink } from "./cook-link";

type PlanItemLineProps = {
  readonly node: PlanItemNode;
  /** Where a dragged item can land on me. */
  readonly zones: readonly ZoneSpec[];
  /** How my handle shows, if not as one that drags. */
  readonly handle?: "disabled" | "placeholder";
  /** Whether I say which plan my item is from. */
  readonly showsPlan?: boolean;
  /** Set at my far end, before my delete. */
  readonly chips?: ReactNode;
  /** My item's name, however it's shown. */
  readonly children: ReactNode;
};

/**
 * I am one plan item's line: its status, its name, its plan when asked, a
 * link to cook it when something sits below it, then chips and its delete
 * at my far end.
 */
export function PlanItemLine({
  node,
  zones,
  handle,
  showsPlan = false,
  chips,
  children,
}: PlanItemLineProps) {
  const { id, name } = node.item;
  const plan = useItemPlan(id);

  return (
    <ItemRow
      itemId={id}
      name={name}
      zones={zones}
      handle={handle}
      className="py-px"
    >
      {plan !== undefined ? (
        <StatusButton
          itemId={id}
          planId={plan.id}
          canChange={plan.changeable}
        />
      ) : null}
      {children}
      {showsPlan && plan ? <PlanDot plan={plan} className="ms-xxs" /> : null}
      {plan !== undefined && node.item.children.length > 0 ? (
        <CookLink planId={plan.id} itemId={id} name={name} />
      ) : null}
      {/* Names and chips give way before a row runs off its edge. */}
      <span className="ms-auto flex min-w-0 flex-wrap items-center justify-end gap-xs">
        {chips}
      </span>
      {plan?.changeable ? <DeleteButton itemId={id} planId={plan.id} /> : null}
    </ItemRow>
  );
}
