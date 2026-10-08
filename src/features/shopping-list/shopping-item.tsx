import { NoStoreOrderIcon } from "@/components/icons";
import { LINE_CONTROL_CLASS_NAME } from "@/components/line-control";
import { PlanDotStack } from "@/components/plan-dot";
import { useShowsPlanIndicators } from "@/features/plan-directory";
import { DraftRow } from "@/features/plan-edit";
import { PlanItemRow } from "@/features/plan-item/row";
import { BulkStatusButton } from "@/features/plan-status";
import { ItemRow } from "@/lib/dnd/item-row";
import { ZoneSpec } from "@/lib/dnd/zone-layer";
import { humanQuantity } from "@/lib/quantity";
import { Disclosure } from "@heroui/react";
import { groupOf, ShoppingRow, ShoppingRows } from "./entries";
import { ShoppingItem } from "./model";
import { UNPLACED } from "./store-order";

type ShoppingItemRowProps = {
  readonly item: ShoppingItem;
  /** Every list's rows; left out, my plan items as they are. */
  readonly rows?: ShoppingRows;
  /** Where a dragged ingredient can land on my line. */
  readonly zones?: readonly ZoneSpec[];
};

type ShoppingRowLineProps = {
  readonly row: ShoppingRow;
  /** The list I'm shown in. */
  readonly group: string;
  /** Whether I leave a handle's room, lining up with shopping items. */
  readonly handleSpace?: boolean;
  readonly className?: string;
};

export function rowKey(row: ShoppingRow): string {
  return row.kind === "item" ? row.source.item.id : row.draft.draftId;
}

/** I am one line of a list: a plan item, or a new one being made. */
export function ShoppingRowLine({
  row,
  group,
  handleSpace = false,
  className,
}: ShoppingRowLineProps) {
  const line =
    row.kind === "draft" ? (
      // spaced as a status is, so names line up
      <div className="flex items-start gap-xs">
        <span className={LINE_CONTROL_CLASS_NAME} />
        <DraftRow draft={row.draft} />
      </div>
    ) : (
      <PlanItemRow
        item={row.source.item}
        ancestors={row.source.ancestors}
        plan={row.source.plan}
        countsAs={row.source.countsAs}
        group={group}
      />
    );
  return (
    <li className={className}>
      {handleSpace ? (
        // spaced as a handle is, so statuses line up
        <div className="flex items-start gap-xxs">
          <span className={LINE_CONTROL_CLASS_NAME} />
          <div className="min-w-0 flex-1">{line}</div>
        </div>
      ) : (
        line
      )}
    </li>
  );
}

const AMOUNT_SEPARATOR = ", ";
const NO_STORE_ORDER_LABEL = "Where should this go?";

/**
 * I show one ingredient and how much of it is needed, expanding to show
 * every plan item that calls for it.
 */
export function ShoppingItemRow({
  item,
  rows,
  zones = [],
}: ShoppingItemRowProps) {
  const showsPlans = useShowsPlanIndicators();
  const amounts = item.implicit
    ? ""
    : item.amounts
        .map(({ quantity, unit }) =>
          unit === null
            ? humanQuantity(quantity)
            : `${humanQuantity(quantity)} ${unit.name}`,
        )
        .join(AMOUNT_SEPARATOR);

  return (
    <Disclosure id={item.ingredient.id}>
      {/* a plain row, not a heading, so it reads as body text */}
      <ItemRow
        itemId={item.ingredient.id}
        name={item.ingredient.name}
        zones={zones}
        className="py-xs"
      >
        <div className="flex min-w-0 flex-1 items-start gap-xs">
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
            {item.ingredient.storeOrder === UNPLACED ? (
              <span
                role="img"
                aria-label={NO_STORE_ORDER_LABEL}
                className="inline-flex h-[1lh] shrink-0 items-center text-muted"
              >
                <NoStoreOrderIcon size="small" aria-hidden />
              </span>
            ) : null}
            <Disclosure.Indicator className="ms-auto" />
          </Disclosure.Trigger>
        </div>
      </ItemRow>
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
