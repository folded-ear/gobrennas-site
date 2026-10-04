import { describe, expect, it } from "vitest";
import { FRACTIONS, type FractionRow } from "./fractions";
import { displayQuantity } from "./quantity";

const fractions: readonly FractionRow[] = [
  [0.06, 0.063, "1/16"],
  [0.33, 0.334, "⅓"],
  [0.5, null, "½"],
  [0.66, 0.67, "⅔"],
];

describe("displayQuantity", () => {
  it.each([
    ["1/2", "½"],
    ["0.5", "½"],
    [".5", "½"],
    ["2/4", "½"],
    ["0.33", "⅓"],
    ["0.333", "⅓"],
    ["1/3", "⅓"],
    ["0.66", "⅔"],
    ["0.67", "⅔"],
    ["0.666666", "⅔"],
    ["0.062", "1/16"],
    ["0.063", "1/16"],
    ["1/16", "1/16"],
  ])("shows %s as %s", (written, shown) => {
    expect(displayQuantity(written, fractions)).toBe(shown);
  });

  it.each([
    ["1.5", "1½"],
    ["1 1/2", "1½"],
    ["3/2", "1½"],
    ["2.33", "2⅓"],
    ["1.063", "1 1/16"],
    ["1 1/16", "1 1/16"],
    ["17/16", "1 1/16"],
  ])("puts the whole number of %s in front: %s", (written, shown) => {
    expect(displayQuantity(written, fractions)).toBe(shown);
  });

  it.each([
    ["0.3"],
    ["0.30"],
    ["0.51"],
    ["0.335"],
    ["0.0631"],
    ["1/5"],
    ["2"],
    ["0"],
    ["1.0"],
    ["1½"],
    ["1-2"],
    ["a few"],
    [" 1/2 "],
    ["1/0"],
  ])("leaves %j as written", (written) => {
    expect(displayQuantity(written, fractions)).toBe(written);
  });

  it("covers exactly low when a row's high is null", () => {
    expect(displayQuantity("0.5", fractions)).toBe("½");
    expect(displayQuantity("0.500001", fractions)).toBe("0.500001");
    expect(displayQuantity("0.499999", fractions)).toBe("0.499999");
  });

  it("matches numbers the same way as their text", () => {
    expect(displayQuantity(0.5, fractions)).toBe("½");
    expect(displayQuantity(1 / 3, fractions)).toBe("⅓");
    expect(displayQuantity(2 / 3, fractions)).toBe("⅔");
    expect(displayQuantity(1.0625, fractions)).toBe("1 1/16");
    expect(displayQuantity(1 / 12, fractions)).toBe(String(1 / 12));
    expect(displayQuantity(2, fractions)).toBe("2");
    expect(displayQuantity(0, fractions)).toBe("0");
  });

  it("matches each bound exactly, whatever the whole number", () => {
    for (let whole = 0; whole <= 20; whole++) {
      for (const [low, high, display] of FRACTIONS) {
        for (const bound of [low, high ?? low]) {
          const written = `${whole}${String(bound).slice(1)}`;
          const shown = displayQuantity(written);
          expect(shown, written).toContain(display);
        }
      }
    }
  });
});

describe("FRACTIONS", () => {
  it("has sorted rows that never overlap", () => {
    FRACTIONS.forEach(([low, high], i) => {
      expect(low, `row ${i}`).toBeGreaterThan(0);
      expect(high ?? low, `row ${i}`).toBeGreaterThanOrEqual(low);
      expect(high ?? low, `row ${i}`).toBeLessThan(1);
      const next = FRACTIONS[i + 1];
      if (next) expect(next[0], `row ${i + 1}`).toBeGreaterThan(high ?? low);
    });
  });
});
