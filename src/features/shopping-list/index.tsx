import { PlanItemRow } from "@/features/plan-item/row";
import { DisclosureGroup } from "@heroui/react";
import { useId } from "react";
import { Region, ShoppingList } from "./model";
import { ShoppingItemRow } from "./shopping-item";

type ShoppingRegionsProps = {
  readonly list: ShoppingList;
};

type RegionSectionProps = {
  readonly title: string;
  /** Whether my title shows, or only names me to assistive tech. */
  readonly showsTitle: boolean;
  readonly region: Region;
};

function isEmpty({ items, unresolved }: Region): boolean {
  return items.length === 0 && unresolved.length === 0;
}

/** I show one region: its shopping items, then its loose plan items. */
function RegionSection({ title, showsTitle, region }: RegionSectionProps) {
  const headingId = useId();
  if (isEmpty(region)) return null;

  return (
    <section
      aria-label={showsTitle ? undefined : title}
      aria-labelledby={showsTitle ? headingId : undefined}
      className="flex flex-col gap-sm"
    >
      {showsTitle ? <h2 id={headingId}>{title}</h2> : null}
      <ul className="flex flex-col gap-sm">
        {region.items.map((item) => (
          <li key={item.ingredient.id}>
            <ShoppingItemRow item={item} />
          </li>
        ))}
        {region.unresolved.map((source) => (
          <li key={source.item.id}>
            <PlanItemRow
              item={source.item}
              ancestors={source.ancestors}
              plan={source.plan}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * I show what's still needed, then what's been acquired, with at most one
 * shopping item expanded.
 */
export function ShoppingRegions({ list }: ShoppingRegionsProps) {
  if (isEmpty(list.needed) && isEmpty(list.acquired)) {
    return <p>There&apos;s nothing to shop for.</p>;
  }

  return (
    // One group across both regions, so one item is expanded in all.
    <DisclosureGroup className="flex flex-col gap-xl">
      <RegionSection title="Needed" showsTitle={false} region={list.needed} />
      <RegionSection title="Acquired" showsTitle region={list.acquired} />
    </DisclosureGroup>
  );
}
