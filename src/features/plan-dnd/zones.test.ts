import { describe, expect, it } from "vitest";
import { TreeZone } from "./moves";
import {
  BEFORE_ZONE_HEIGHT,
  NEST_ZONE_WIDTH,
  REORDER_ZONES,
  TREE_ZONES,
  ZoneRect,
  zoneStyle,
} from "./zones";

// Sample a grid of points across a row and count which zones claim each.
const STEPS = 20;

function claims(rects: readonly ZoneRect[], x: number, y: number): number {
  return rects.filter(
    (r) =>
      x >= r.left && x < r.left + r.width && y >= r.top && y < r.top + r.height,
  ).length;
}

function everyPoint(check: (x: number, y: number) => void) {
  for (let i = 0; i < STEPS; i++) {
    for (let j = 0; j < STEPS; j++) {
      check((i + 0.5) / STEPS, (j + 0.5) / STEPS);
    }
  }
}

function zoneAt(x: number, y: number): TreeZone | undefined {
  return (Object.keys(TREE_ZONES) as TreeZone[]).find(
    (zone) => claims([TREE_ZONES[zone]], x, y) === 1,
  );
}

describe("TREE_ZONES", () => {
  it("covers the whole row, with no point in two zones", () => {
    const rects = Object.values(TREE_ZONES);

    everyPoint((x, y) => expect(claims(rects, x, y)).toBe(1));
  });

  it("nests a drop landing in the right-hand share of the row", () => {
    const inNestZone = 1 - NEST_ZONE_WIDTH / 2;

    expect(zoneAt(inNestZone, 0.1)).toBe("child");
    expect(zoneAt(inNestZone, 0.9)).toBe("child");
  });

  it("splits the left-hand remainder into before, then after", () => {
    const inGutter = (1 - NEST_ZONE_WIDTH) / 2;

    expect(zoneAt(inGutter, BEFORE_ZONE_HEIGHT / 2)).toBe("before");
    expect(zoneAt(inGutter, (1 + BEFORE_ZONE_HEIGHT) / 2)).toBe("after");
  });
});

describe("REORDER_ZONES", () => {
  it("covers the whole row, with no point in both zones", () => {
    const rects = Object.values(REORDER_ZONES);

    everyPoint((x, y) => expect(claims(rects, x, y)).toBe(1));
  });

  it("puts the top share before and the rest after, full width", () => {
    expect(claims([REORDER_ZONES.before], 0.99, BEFORE_ZONE_HEIGHT / 2)).toBe(
      1,
    );
    expect(
      claims([REORDER_ZONES.after], 0.01, (1 + BEFORE_ZONE_HEIGHT) / 2),
    ).toBe(1);
  });
});

describe("zoneStyle", () => {
  it("positions a zone in percentages of its row", () => {
    expect(
      zoneStyle({ top: 0.5, left: 0.25, width: 0.75, height: 0.5 }),
    ).toEqual({ top: "50%", left: "25%", width: "75%", height: "50%" });
  });
});
