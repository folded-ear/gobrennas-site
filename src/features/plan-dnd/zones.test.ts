import { claims, everyPoint } from "@/lib/dnd/test/zone-grid";
import { BEFORE_ZONE_HEIGHT } from "@/lib/dnd/zones";
import { describe, expect, it } from "vitest";
import { TreeZone } from "./moves";
import { NEST_ZONE_WIDTH, TREE_ZONES } from "./zones";

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
