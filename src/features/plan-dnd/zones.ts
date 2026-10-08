import { BEFORE_ZONE_HEIGHT, ZoneRect } from "@/lib/dnd/zones";
import { TreeZone } from "./moves";

/**
 * Share of a row's width, measured from its right edge, where a drop nests
 * as the row's first child. The rest, on the left, is split before/after.
 */
export const NEST_ZONE_WIDTH = 0.75;

const GUTTER_WIDTH = 1 - NEST_ZONE_WIDTH;
const AFTER_ZONE_HEIGHT = 1 - BEFORE_ZONE_HEIGHT;

/** Where on a tree row each zone sits, in the order a keyboard visits them. */
export const TREE_ZONES: Readonly<Record<TreeZone, ZoneRect>> = {
  before: { top: 0, left: 0, width: GUTTER_WIDTH, height: BEFORE_ZONE_HEIGHT },
  child: { top: 0, left: GUTTER_WIDTH, width: NEST_ZONE_WIDTH, height: 1 },
  after: {
    top: BEFORE_ZONE_HEIGHT,
    left: 0,
    width: GUTTER_WIDTH,
    height: AFTER_ZONE_HEIGHT,
  },
};
