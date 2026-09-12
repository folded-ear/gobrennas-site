import { DraggedItem } from "./drag-session";
import { PlanTree, TreeMove, treeMove, TreeZone } from "./moves";
import { ZoneIndicator, ZoneSpec } from "./zone-layer";
import { ZoneRect } from "./zones";

const INDICATORS: Readonly<Record<TreeZone, ZoneIndicator>> = {
  child: "nest",
  before: "before",
  after: "after",
};

const LABELS: Readonly<Record<TreeZone, (name: string) => string>> = {
  child: (name) => `Nest under ${name}`,
  before: (name) => `Put before ${name}`,
  after: (name) => `Put after ${name}`,
};

type TreeZonesInput = {
  tree: PlanTree;
  dragged: DraggedItem;
  target: { readonly id: string; readonly name: string };
  /** Which zones the target offers, and where on its row each sits. */
  rects: Readonly<Partial<Record<TreeZone, ZoneRect>>>;
  onMove(move: TreeMove): void;
};

/**
 * I give the zones where a dragged item may land on one target row: one
 * per offered position whose move would change something.
 */
export function treeZones({
  tree,
  dragged,
  target,
  rects,
  onMove,
}: TreeZonesInput): readonly ZoneSpec[] {
  return (Object.keys(rects) as TreeZone[]).flatMap((zone) => {
    const rect = rects[zone];
    const move = treeMove(tree, dragged.id, target.id, zone);
    if (rect === undefined || move === null) return [];
    return [
      {
        rect,
        indicator: INDICATORS[zone],
        label: LABELS[zone](target.name),
        onDrop: () => onMove(move),
      },
    ];
  });
}
