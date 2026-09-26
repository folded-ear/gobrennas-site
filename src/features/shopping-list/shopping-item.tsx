import { PlanDotStack } from "@/components/plan-dot";
import { useShowsPlanIndicators } from "@/features/plan-directory";
import { PlanItemRow } from "@/features/plan-item/row";
import { Disclosure } from "@heroui/react";
import { formatAmount, ShoppingItem } from "./model";

type ShoppingItemRowProps = {
  readonly item: ShoppingItem;
  readonly isExpanded: boolean;
  readonly onExpandedChange: (isExpanded: boolean) => void;
};

const AMOUNT_SEPARATOR = ", ";

/**
 * I show one ingredient and how much of it is needed, expanding to show
 * every plan item that calls for it.
 */
export function ShoppingItemRow({
  item,
  isExpanded,
  onExpandedChange,
}: ShoppingItemRowProps) {
  const showsPlans = useShowsPlanIndicators();
  const amounts = item.implicit
    ? ""
    : item.amounts.map(formatAmount).join(AMOUNT_SEPARATOR);

  return (
    <Disclosure isExpanded={isExpanded} onExpandedChange={onExpandedChange}>
      {/* a plain row, not a heading, so it reads as body text */}
      <div className="flex">
        <Disclosure.Trigger className="flex w-full items-start gap-sm text-left">
          <span>{item.ingredient.name}</span>
          {amounts ? <span className="text-muted">{amounts}</span> : null}
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
