import { PlanTree } from "@/features/plan-dnd/moves";
import { EditSurfaceProvider, useEditState } from "@/features/plan-edit";
import { Disclosure, DisclosureGroup } from "@heroui/react";
import { useId, useState } from "react";
import {
  LOOSE_ACQUIRED,
  LOOSE_NEEDED,
  ShoppingRow,
  ShoppingRows,
  shoppingRows,
} from "./entries";
import { Region, ShoppingList } from "./model";
import { rowKey, ShoppingItemRow, ShoppingRowLine } from "./shopping-item";

type ShoppingRegionsProps = {
  readonly list: ShoppingList;
  /** The shopped plans' trees. Left out, nothing can be edited. */
  readonly tree?: PlanTree;
};

type RegionSectionProps = {
  readonly title: string;
  /** Whether my title shows, or only names me to assistive tech. */
  readonly showsTitle: boolean;
  /** Whether I start collapsed, my title then counting what's inside. */
  readonly collapsible?: boolean;
  readonly region: Region;
  /** My loose rows, new items among them, and the list they make. */
  readonly loose: readonly ShoppingRow[];
  readonly looseGroup: string;
  readonly rows: ShoppingRows;
};

function isEmpty({ items }: Region, loose: readonly ShoppingRow[]): boolean {
  return items.length === 0 && loose.length === 0;
}

/** I show one region: its shopping items, then its loose plan items. */
function RegionSection({
  title,
  showsTitle,
  collapsible = false,
  region,
  loose,
  looseGroup,
  rows,
}: RegionSectionProps) {
  const headingId = useId();
  if (isEmpty(region, loose)) return null;

  const list = (
    <ul className="flex flex-col gap-sm">
      {region.items.map((item) => (
        <li key={item.ingredient.id}>
          <ShoppingItemRow item={item} rows={rows} />
        </li>
      ))}
      {loose.map((row) => (
        <ShoppingRowLine key={rowKey(row)} row={row} group={looseGroup} />
      ))}
    </ul>
  );

  return (
    <section
      aria-label={showsTitle ? undefined : title}
      aria-labelledby={showsTitle ? headingId : undefined}
      className={
        collapsible ? "mt-md flex flex-col gap-sm" : "flex flex-col gap-sm"
      }
    >
      {collapsible ? (
        // No id, so I keep my own state rather than joining the item group.
        <Disclosure>
          <Disclosure.Heading id={headingId} level={2} className="text-lg">
            <Disclosure.Trigger className="flex w-full items-center gap-sm text-left">
              {title} ({region.items.length + loose.length})
              <Disclosure.Indicator className="ms-auto" />
            </Disclosure.Trigger>
          </Disclosure.Heading>
          <Disclosure.Content>
            <Disclosure.Body>{list}</Disclosure.Body>
          </Disclosure.Content>
        </Disclosure>
      ) : (
        <>
          {showsTitle ? <h2 id={headingId}>{title}</h2> : null}
          {list}
        </>
      )}
    </section>
  );
}

/**
 * I show what's still needed, then what's acquired, with at most one
 * shopping item expanded. Given the plans' trees, plan items can be edited
 * in place.
 */
export function ShoppingRegions({ list, tree }: ShoppingRegionsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const edit = useEditState();
  const rows = shoppingRows(list, expandedId, edit.drafts);
  const neededLoose = rows.groups.get(LOOSE_NEEDED)!;
  const acquiredLoose = rows.groups.get(LOOSE_ACQUIRED)!;
  if (
    isEmpty(list.needed, neededLoose) &&
    isEmpty(list.acquired, acquiredLoose)
  ) {
    return <p>There&apos;s nothing to shop for.</p>;
  }

  const regions = (
    // One group spans both regions, so only one item is ever expanded.
    <DisclosureGroup
      className="flex flex-col gap-xl"
      expandedKeys={expandedId === null ? [] : [expandedId]}
      onExpandedChange={(keys) => {
        const [key] = keys;
        setExpandedId(key === undefined ? null : String(key));
      }}
    >
      <RegionSection
        title="Needed"
        showsTitle={false}
        region={list.needed}
        loose={neededLoose}
        looseGroup={LOOSE_NEEDED}
        rows={rows}
      />
      <RegionSection
        title="Acquired"
        showsTitle
        collapsible
        region={list.acquired}
        loose={acquiredLoose}
        looseGroup={LOOSE_ACQUIRED}
        rows={rows}
      />
    </DisclosureGroup>
  );

  if (tree === undefined) return regions;
  return (
    <EditSurfaceProvider
      state={edit}
      order={rows.order}
      tree={tree}
      createdStayPut={false}
    >
      {regions}
    </EditSurfaceProvider>
  );
}
