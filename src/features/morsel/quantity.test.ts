import { describe, expect, it } from "vitest";
import { FRACTIONS } from "./fractions";
import { humanQuantity } from "./quantity";

describe("humanQuantity", () => {
  it.each([
    [0.5, "½"],
    [1 / 3, "⅓"],
    [0.33, "⅓"],
    [0.333, "⅓"],
    [2 / 3, "⅔"],
    [0.66, "⅔"],
    [0.67, "⅔"],
    [0.0625, "1/16"],
    [0.062, "1/16"],
    [0.063, "1/16"],
  ])("shows %s as %s", (quantity, shown) => {
    expect(humanQuantity(quantity)).toBe(shown);
  });

  it.each([
    [1.5, "1½"],
    [2.33, "2⅓"],
    [1.063, "1 1/16"],
    [17 / 16, "1 1/16"],
  ])("puts the whole number of %s in front: %s", (quantity, shown) => {
    expect(humanQuantity(quantity)).toBe(shown);
  });

  it.each([[0.3], [0.51], [0.335], [0.0631], [0.2], [1 / 12], [2], [0]])(
    "shows %s as itself when no fraction covers it",
    (quantity) => {
      expect(humanQuantity(quantity)).toBe(String(quantity));
    },
  );

  it.each([
    [0.2, "1/5", "1/5"],
    [0.2, 7, "7"],
    [0.5, "a half", "½"],
  ])("shows %s with fallback %j as %s", (quantity, fallback, shown) => {
    expect(humanQuantity(quantity, fallback)).toBe(shown);
  });

  it("covers exactly low when a row's high is null", () => {
    expect(humanQuantity(0.5)).toBe("½");
    expect(humanQuantity(0.500001)).toBe("0.500001");
    expect(humanQuantity(0.499999)).toBe("0.499999");
  });

  it("matches each bound exactly, whatever the whole number", () => {
    for (let whole = 0; whole <= 20; whole++) {
      for (const [low, high, display] of FRACTIONS) {
        for (const bound of [low, high ?? low]) {
          const written = `${whole}${String(bound).slice(1)}`;
          expect(humanQuantity(Number(written)), written).toContain(display);
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
