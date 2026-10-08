import { PlanTree } from "@/features/plan-dnd/moves";
import { EditSurfaceProvider, useEditState } from "@/features/plan-edit";
import { DragSession, useDragSession } from "@/lib/dnd/drag-session";
import { Disclosure, DisclosureGroup } from "@heroui/react";
import { useId, useState } from "react";
import {
  LOOSE_ACQUIRED,
  LOOSE_NEEDED,
  ShoppingRow,
  ShoppingRows,
  shoppingRows,
} from "./entries";
import { Region, ShoppingIngredient, ShoppingList } from "./model";
import { rowKey, ShoppingItemRow, ShoppingRowLine } from "./shopping-item";
import { storeZones } from "./store-zones";
import { StoreMoves } from "./use-store-moves";

type ShoppingRegionsProps = {
  readonly list: ShoppingList;
  /** The shopped plans' trees. Left out, nothing can be edited. */
  readonly tree?: PlanTree;
  /** Called as Acquired opens or closes. */
  readonly onAcquiredToggle?: () => void;
  /** Left out, nothing can be put in store order. */
  readonly storeMoves?: StoreMoves;
};

type RegionSectionProps = {
  readonly title: string;
  /** Whether my title shows, or only names me to assistive tech. */
  readonly showsTitle: boolean;
  /** Whether I start collapsed, my title then counting what's inside. */
  readonly collapsible?: boolean;
  /** Called as I open or close, when collapsible. */
  readonly onToggle?: () => void;
  readonly region: Region;
  /** My loose rows, new items among them, and the list they make. */
  readonly loose: readonly ShoppingRow[];
  readonly looseGroup: string;
  readonly rows: ShoppingRows;
  /** The one shopping item expanded, whichever region it's in. */
  readonly expandedId: string | null;
  readonly onExpandedChange: (id: string | null) => void;
  /** Left out, nothing can be put in store order. */
  readonly storeMoves?: StoreMoves;
};

const STORE_ITEM_DRAG_TYPE = "application/x.gobrennas.store-item";

/** Only shopping items have handles, and any of them can be moved. */
const anyIngredient = () => true;

function isEmpty({ items }: Region, loose: readonly ShoppingRow[]): boolean {
  return items.length === 0 && loose.length === 0;
}

/** I show one region: its shopping items, then its loose plan items. */
function RegionSection({
  title,
  showsTitle,
  collapsible = false,
  onToggle,
  region,
  loose,
  looseGroup,
  rows,
  expandedId,
  onExpandedChange,
  storeMoves,
}: RegionSectionProps) {
  const headingId = useId();
  const { dragged } = useDragSession();
  if (isEmpty(region, loose)) return null;

  const ingredients = region.items.map((it) => it.ingredient);
  // Only an ingredient shown here can be put among the ones shown here.
  const moving =
    storeMoves !== undefined &&
    dragged !== null &&
    ingredients.some((it) => it.id === dragged.id)
      ? { storeMoves, dragged }
      : null;
  const zonesOn = (target: ShoppingIngredient) =>
    moving === null
      ? []
      : storeZones({
          ingredients,
          dragged: moving.dragged,
          target,
          onMove: (after) =>
            moving.storeMoves.move(
              moving.dragged.id,
              target.id,
              after,
              moving.dragged.name,
            ),
        });

  const list = (
    // Only my items join; a group claims every Disclosure inside it.
    <DisclosureGroup
      expandedKeys={expandedId === null ? [] : [expandedId]}
      onExpandedChange={(keys) => {
        const [key] = keys;
        onExpandedChange(key === undefined ? null : String(key));
      }}
    >
      {/* Rows pad themselves rather than the list gapping them, so their
          drop zones meet. */}
      <ul className="flex flex-col">
        {region.items.map((item) => (
          <li key={item.ingredient.id}>
            <ShoppingItemRow
              item={item}
              rows={rows}
              zones={zonesOn(item.ingredient)}
            />
          </li>
        ))}
        {loose.map((row) => (
          <ShoppingRowLine
            key={rowKey(row)}
            row={row}
            group={looseGroup}
            handleSpace={storeMoves !== undefined}
            className="py-xs"
          />
        ))}
      </ul>
    </DisclosureGroup>
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
        <Disclosure onExpandedChange={onToggle}>
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
export function ShoppingRegions({
  list,
  tree,
  onAcquiredToggle,
  storeMoves,
}: ShoppingRegionsProps) {
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
    // Both regions share one expanded item, so only one is ever expanded.
    <div className="flex flex-col gap-xl">
      <RegionSection
        title="Needed"
        showsTitle={false}
        region={list.needed}
        loose={neededLoose}
        looseGroup={LOOSE_NEEDED}
        rows={rows}
        expandedId={expandedId}
        onExpandedChange={setExpandedId}
        storeMoves={storeMoves}
      />
      <RegionSection
        title="Acquired"
        showsTitle
        collapsible
        onToggle={onAcquiredToggle}
        region={list.acquired}
        loose={acquiredLoose}
        looseGroup={LOOSE_ACQUIRED}
        rows={rows}
        expandedId={expandedId}
        onExpandedChange={setExpandedId}
        storeMoves={storeMoves}
      />
    </div>
  );
  const movable =
    storeMoves === undefined ? (
      regions
    ) : (
      <DragSession dragType={STORE_ITEM_DRAG_TYPE} canMove={anyIngredient}>
        {regions}
      </DragSession>
    );

  if (tree === undefined) return movable;
  return (
    <EditSurfaceProvider
      state={edit}
      order={rows.order}
      tree={tree}
      createdStayPut={false}
    >
      {movable}
    </EditSurfaceProvider>
  );
}
