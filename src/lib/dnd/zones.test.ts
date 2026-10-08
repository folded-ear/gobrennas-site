import { describe, expect, it } from "vitest";
import { claims, everyPoint } from "./test/zone-grid";
import { BEFORE_ZONE_HEIGHT, REORDER_ZONES, zoneStyle } from "./zones";

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
