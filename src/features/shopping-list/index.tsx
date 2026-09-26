import { PlanItemRow } from "@/features/plan-item/row";
import { useId, useState } from "react";
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
  readonly expandedId: string | null;
  readonly onExpand: (ingredientId: string | null) => void;
};

function isEmpty({ items, unresolved }: Region): boolean {
  return items.length === 0 && unresolved.length === 0;
}

/** I show one region: its shopping items, then its loose plan items. */
function RegionSection({
  title,
  showsTitle,
  region,
  expandedId,
  onExpand,
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
            <ShoppingItemRow
              item={item}
              isExpanded={item.ingredient.id === expandedId}
              onExpandedChange={(isExpanded) =>
                onExpand(isExpanded ? item.ingredient.id : null)
              }
            />
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  if (isEmpty(list.needed) && isEmpty(list.acquired)) {
    return <p>There&apos;s nothing to shop for.</p>;
  }

  return (
    <div className="flex flex-col gap-xl">
      <RegionSection
        title="Needed"
        showsTitle={false}
        region={list.needed}
        expandedId={expandedId}
        onExpand={setExpandedId}
      />
      <RegionSection
        title="Acquired"
        showsTitle
        region={list.acquired}
        expandedId={expandedId}
        onExpand={setExpandedId}
      />
    </div>
  );
}
