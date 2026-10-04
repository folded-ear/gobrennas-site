import { PlanDotStack } from "@/components/plan-dot";
import { useShowsPlanIndicators } from "@/features/plan-directory";
import { DraftRow } from "@/features/plan-edit";
import { PlanItemRow } from "@/features/plan-item/row";
import {
  BulkStatusButton,
  LINE_CONTROL_CLASS_NAME,
} from "@/features/plan-status";
import { Disclosure } from "@heroui/react";
import { groupOf, ShoppingRow, ShoppingRows } from "./entries";
import { formatAmount, ShoppingItem } from "./model";

type ShoppingItemRowProps = {
  readonly item: ShoppingItem;
  /** Every list's rows; left out, my plan items as they are. */
  readonly rows?: ShoppingRows;
};

type ShoppingRowLineProps = {
  readonly row: ShoppingRow;
  /** The list I'm shown in. */
  readonly group: string;
};

export function rowKey(row: ShoppingRow): string {
  return row.kind === "item" ? row.source.item.id : row.draft.draftId;
}

/** I am one line of a list: a plan item, or a new one being made. */
export function ShoppingRowLine({ row, group }: ShoppingRowLineProps) {
  if (row.kind === "draft") {
    return (
      <li>
        {/* spaced as a status is, so names line up */}
        <div className="flex items-start gap-xs">
          <span className={LINE_CONTROL_CLASS_NAME} />
          <DraftRow draft={row.draft} />
        </div>
      </li>
    );
  }
  return (
    <li>
      <PlanItemRow
        item={row.source.item}
        ancestors={row.source.ancestors}
        plan={row.source.plan}
        countsAs={row.source.countsAs}
        group={group}
      />
    </li>
  );
}

const AMOUNT_SEPARATOR = ", ";

/**
 * I show one ingredient and how much of it is needed, expanding to show
 * every plan item that calls for it.
 */
export function ShoppingItemRow({ item, rows }: ShoppingItemRowProps) {
  const showsPlans = useShowsPlanIndicators();
  const amounts = item.implicit
    ? ""
    : item.amounts.map(formatAmount).join(AMOUNT_SEPARATOR);

  return (
    <Disclosure id={item.ingredient.id}>
      {/* a plain row, not a heading, so it reads as body text */}
      <div className="flex items-start gap-xs">
        <BulkStatusButton
          items={item.sources.map((it) => ({
            id: it.item.id,
            planId: it.plan.id,
          }))}
          status={item.countsAs}
          name={item.ingredient.name}
          canChange={item.sources.every((it) => it.plan.changeable)}
        />
        <Disclosure.Trigger className="flex min-w-0 flex-1 items-start gap-sm text-left">
          <span>{item.ingredient.name}</span>
          {amounts ? <span className="text-muted">({amounts})</span> : null}
          {showsPlans ? <PlanDotStack plans={item.plans} /> : null}
          <Disclosure.Indicator className="ms-auto" />
        </Disclosure.Trigger>
      </div>
      <Disclosure.Content>
        <Disclosure.Body>
          <ul className="flex flex-col gap-xs ps-lg">
            {(
              rows?.groups.get(groupOf(item)) ??
              item.sources.map((source): ShoppingRow => ({
                kind: "item",
                source,
              }))
            ).map((row) => (
              <ShoppingRowLine
                key={rowKey(row)}
                row={row}
                group={groupOf(item)}
              />
            ))}
          </ul>
        </Disclosure.Body>
      </Disclosure.Content>
    </Disclosure>
  );
}
