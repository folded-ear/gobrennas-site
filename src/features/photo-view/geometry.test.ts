import { describe, expect, it } from "vitest";
import {
  boxBetween,
  isSideways,
  overlaps,
  toView,
  turn,
  viewPoint,
  type Box,
  type QuarterTurns,
} from "./geometry";

const TURNS: readonly QuarterTurns[] = [0, 1, 2, 3];

/** A box near the photo's top left, wider than tall. */
const BOX: Box = { left: 0.1, top: 0.2, width: 0.3, height: 0.05 };

const rounded = ({ left, top, width, height }: Box) =>
  [left, top, width, height].map((it) => Number(it.toFixed(6)));

describe("turning a photo", () => {
  it("steps through the quarters and around, either way", () => {
    expect(TURNS.map((q) => turn(q, 1))).toEqual([1, 2, 3, 0]);
    expect(TURNS.map((q) => turn(q, -1))).toEqual([3, 0, 1, 2]);
  });

  it("is sideways at the odd quarters", () => {
    expect(TURNS.map(isSideways)).toEqual([false, true, false, true]);
  });
});

describe("mapping a box into view space", () => {
  it("leaves it alone when the photo isn't turned", () => {
    expect(toView(BOX, 0)).toBe(BOX);
  });

  it("carries the photo's top left to the view's top right, a quarter on", () => {
    expect(rounded(toView(BOX, 1))).toEqual([0.75, 0.1, 0.05, 0.3]);
  });

  it("carries it to the bottom right, a half turn on", () => {
    expect(rounded(toView(BOX, 2))).toEqual([0.6, 0.75, 0.3, 0.05]);
  });

  it("carries it to the bottom left, three quarters on", () => {
    expect(rounded(toView(BOX, 3))).toEqual([0.2, 0.6, 0.05, 0.3]);
  });

  it("keeps the box inside the view at every turn", () => {
    for (const q of TURNS) {
      const { left, top, width, height } = toView(BOX, q);
      expect(Math.min(left, top)).toBeGreaterThanOrEqual(0);
      expect(Math.max(left + width, top + height)).toBeLessThanOrEqual(1);
    }
  });

  it("agrees with turning a quarter at a time", () => {
    const quarter = (box: Box) => toView(box, 1);

    expect(rounded(toView(BOX, 2))).toEqual(rounded(quarter(quarter(BOX))));
    expect(rounded(toView(BOX, 3))).toEqual(
      rounded(quarter(quarter(quarter(BOX)))),
    );
    expect(rounded(quarter(quarter(quarter(quarter(BOX)))))).toEqual(
      rounded(BOX),
    );
  });
});

describe("overlapping boxes", () => {
  const box = (left: number, top: number, width = 0.2, height = 0.2): Box => ({
    left,
    top,
    width,
    height,
  });

  it("holds for boxes that share some area", () => {
    expect(overlaps(box(0.1, 0.1), box(0.2, 0.2))).toBe(true);
  });

  it("holds for boxes that only share an edge or a corner", () => {
    expect(overlaps(box(0.1, 0.1), box(0.3, 0.1))).toBe(true);
    expect(overlaps(box(0.1, 0.1), box(0.3, 0.3))).toBe(true);
  });

  it("fails for boxes apart across or down", () => {
    expect(overlaps(box(0.1, 0.1), box(0.4, 0.1))).toBe(false);
    expect(overlaps(box(0.1, 0.1), box(0.1, 0.4))).toBe(false);
  });

  it("holds for a point inside a box, and fails for one outside", () => {
    expect(overlaps(box(0.15, 0.15, 0, 0), box(0.1, 0.1))).toBe(true);
    expect(overlaps(box(0.05, 0.15, 0, 0), box(0.1, 0.1))).toBe(false);
  });
});

describe("the box between two points", () => {
  it("is the same whichever corners the points are", () => {
    const expected = [0.2, 0.3, 0.4, 0.1];

    expect(rounded(boxBetween({ x: 0.2, y: 0.3 }, { x: 0.6, y: 0.4 }))).toEqual(
      expected,
    );
    expect(rounded(boxBetween({ x: 0.6, y: 0.4 }, { x: 0.2, y: 0.3 }))).toEqual(
      expected,
    );
    expect(rounded(boxBetween({ x: 0.6, y: 0.3 }, { x: 0.2, y: 0.4 }))).toEqual(
      expected,
    );
  });

  it("has no size between a point and itself", () => {
    const point = { x: 0.5, y: 0.5 };

    expect(boxBetween(point, point)).toEqual({
      left: 0.5,
      top: 0.5,
      width: 0,
      height: 0,
    });
  });
});

describe("a pointer's place in view space", () => {
  it("is its share of the way across and down the layer, wherever that is", () => {
    const layer = { left: 100, top: 400, width: 300, height: 600 };

    expect(viewPoint({ clientX: 175, clientY: 700 }, layer)).toEqual({
      x: 0.25,
      y: 0.5,
    });
  });
});
