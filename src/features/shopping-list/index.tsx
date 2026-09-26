import { PlanItemRow } from "@/features/plan-item/row";
import { useId } from "react";
import { Region, ShoppingList } from "./model";
import { ShoppingItemRow } from "./shopping-item";

type ShoppingRegionsProps = {
  readonly list: ShoppingList;
};

type RegionSectionProps = {
  readonly title: string;
  readonly region: Region;
};

function isEmpty({ items, unresolved }: Region): boolean {
  return items.length === 0 && unresolved.length === 0;
}

/** I show one region: its shopping items, then its loose plan items. */
function RegionSection({ title, region }: RegionSectionProps) {
  const headingId = useId();
  if (isEmpty(region)) return null;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-sm">
      <h2 id={headingId}>{title}</h2>
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

/** I show what's still needed, then what's been acquired. */
export function ShoppingRegions({ list }: ShoppingRegionsProps) {
  if (isEmpty(list.needed) && isEmpty(list.acquired)) {
    return <p>There&apos;s nothing to shop for.</p>;
  }

  return (
    <div className="flex flex-col gap-xl">
      <RegionSection title="Needed" region={list.needed} />
      <RegionSection title="Acquired" region={list.acquired} />
    </div>
  );
}
