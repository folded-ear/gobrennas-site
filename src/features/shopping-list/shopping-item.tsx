import { PlanDotStack } from "@/components/plan-dot";
import { useShowsPlanIndicators } from "@/features/plan-directory";
import { PlanItemRow } from "@/features/plan-item/row";
import { BulkStatusButton, ToggleStatus } from "@/features/plan-status";
import { Disclosure } from "@heroui/react";
import { formatAmount, ShoppingItem } from "./model";

type ShoppingItemRowProps = {
  readonly item: ShoppingItem;
  /** The status my plan items show as, together. */
  readonly status: ToggleStatus;
};

const AMOUNT_SEPARATOR = ", ";

/**
 * I show one ingredient and how much of it is needed, expanding to show
 * every plan item that calls for it.
 */
export function ShoppingItemRow({ item, status }: ShoppingItemRowProps) {
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
          status={status}
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
            {item.sources.map((source) => (
              <li key={source.item.id}>
                <PlanItemRow
                  item={source.item}
                  ancestors={source.ancestors}
                  plan={source.plan}
                />
              </li>
            ))}
          </ul>
        </Disclosure.Body>
      </Disclosure.Content>
    </Disclosure>
  );
}
