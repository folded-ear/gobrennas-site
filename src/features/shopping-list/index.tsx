import { PlanItemStatus } from "@/__generated__/graphql";
import { PlanItemRow } from "@/features/plan-item/row";
import { ToggleStatus } from "@/features/plan-status";
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
  /** The status my shopping items show as. */
  readonly status: ToggleStatus;
};

function isEmpty({ items, unresolved }: Region): boolean {
  return items.length === 0 && unresolved.length === 0;
}

/** I show one region: its shopping items, then its loose plan items. */
function RegionSection({
  title,
  showsTitle,
  region,
  status,
}: RegionSectionProps) {
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
            <ShoppingItemRow item={item} status={status} />
          </li>
        ))}
        {region.unresolved.map((source) => (
          <li key={source.item.id}>
            <PlanItemRow
              item={source.item}
              ancestors={source.ancestors}
              plan={source.plan}
              countsAs={source.countsAs}
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
    // One group spans both regions, so only one item is ever expanded.
    <DisclosureGroup className="flex flex-col gap-xl">
      <RegionSection
        title="Needed"
        showsTitle={false}
        region={list.needed}
        status={PlanItemStatus.NEEDED}
      />
      <RegionSection
        title="Acquired"
        showsTitle
        region={list.acquired}
        status={PlanItemStatus.ACQUIRED}
      />
    </DisclosureGroup>
  );
}
