import { CSSProperties } from "react";

/** Share of a row's height, measured from its top, where a drop goes before it. */
export const BEFORE_ZONE_HEIGHT = 0.5;

/** A zone's box, in fractions of its row's width and height. */
export type ZoneRect = {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
};

/** Where on a row a drop that only reorders lands. */
export type ReorderZone = "before" | "after";

const AFTER_ZONE_HEIGHT = 1 - BEFORE_ZONE_HEIGHT;

/** Where on a row that can only be reordered, not nested into, each zone sits. */
export const REORDER_ZONES: Readonly<Record<ReorderZone, ZoneRect>> = {
  before: { top: 0, left: 0, width: 1, height: BEFORE_ZONE_HEIGHT },
  after: {
    top: BEFORE_ZONE_HEIGHT,
    left: 0,
    width: 1,
    height: AFTER_ZONE_HEIGHT,
  },
};

/** A zone that fills its whole container. */
export const WHOLE_ZONE: ZoneRect = { top: 0, left: 0, width: 1, height: 1 };

function percent(fraction: number): string {
  return `${fraction * 100}%`;
}

/** I place a zone over its row. */
export function zoneStyle(rect: ZoneRect): CSSProperties {
  return {
    top: percent(rect.top),
    left: percent(rect.left),
    width: percent(rect.width),
    height: percent(rect.height),
  };
}
