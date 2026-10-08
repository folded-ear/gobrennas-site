import { DraggedItem } from "@/lib/dnd/drag-session";
import { ZoneSpec } from "@/lib/dnd/zone-layer";
import { REORDER_ZONES, ReorderZone } from "@/lib/dnd/zones";
import { ShoppingIngredient } from "./model";
import { storeMoveChanges } from "./store-order";

const LABELS: Readonly<Record<ReorderZone, (name: string) => string>> = {
  before: (name) => `Put before ${name}`,
  after: (name) => `Put after ${name}`,
};

type StoreZonesInput = {
  /** The ingredients shown beside the target, it among them. */
  ingredients: readonly ShoppingIngredient[];
  dragged: DraggedItem;
  target: ShoppingIngredient;
  onMove(after: boolean): void;
};

/**
 * I give the zones where a dragged ingredient may land on one target's
 * row: before it and after it, wherever that would change something.
 */
export function storeZones({
  ingredients,
  dragged,
  target,
  onMove,
}: StoreZonesInput): readonly ZoneSpec[] {
  return (Object.keys(REORDER_ZONES) as ReorderZone[]).flatMap((zone) => {
    const after = zone === "after";
    if (!storeMoveChanges(ingredients, dragged.id, target.id, after)) {
      return [];
    }
    return [
      {
        rect: REORDER_ZONES[zone],
        indicator: zone,
        label: LABELS[zone](target.name),
        onDrop: () => onMove(after),
      },
    ];
  });
}
