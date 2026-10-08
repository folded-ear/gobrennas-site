import { describe, expect, it } from "vitest";
import type { ShoppingIngredient } from "./model";
import { byStoreOrder, storeMoveChanges, storeOrdersFor } from "./store-order";

const ALLSPICE = { id: "p1", name: "allspice", storeOrder: 0 };
const CUMIN = { id: "p2", name: "cumin", storeOrder: 0 };
const BASIL = { id: "p3", name: "basil", storeOrder: 10 };
const FLOUR = { id: "p4", name: "flour", storeOrder: 20 };
const SUGAR = { id: "p5", name: "sugar", storeOrder: 30 };

const PLACED = [BASIL, FLOUR, SUGAR];
const MIXED = [ALLSPICE, CUMIN, BASIL, FLOUR, SUGAR];

/** I give ingredients' names as shown once the given orders are set. */
function shownAfter(
  ingredients: readonly ShoppingIngredient[],
  orders: Readonly<Record<string, number>>,
): string[] {
  return ingredients
    .map((it) => ({ ...it, storeOrder: orders[it.id] ?? it.storeOrder }))
    .sort(byStoreOrder)
    .map((it) => it.name);
}

describe("storeOrdersFor", () => {
  it("puts an ingredient after a placed one, short of the next", () => {
    const orders = storeOrdersFor(PLACED, SUGAR.id, BASIL.id, true);

    expect(orders).toEqual({ [SUGAR.id]: 15 });
    expect(shownAfter(PLACED, orders)).toEqual(["basil", "sugar", "flour"]);
  });

  it("puts an ingredient before the first placed one, still placed", () => {
    const orders = storeOrdersFor(PLACED, SUGAR.id, BASIL.id, false);

    expect(orders).toEqual({ [SUGAR.id]: 5 });
  });

  it("puts an ingredient after the last one", () => {
    const orders = storeOrdersFor(PLACED, BASIL.id, SUGAR.id, true);

    expect(shownAfter(PLACED, orders)).toEqual(["flour", "sugar", "basil"]);
    expect(orders[BASIL.id]).toBeGreaterThan(SUGAR.storeOrder);
  });

  it("places an unplaced ingredient, after the unplaced ones", () => {
    const orders = storeOrdersFor(MIXED, CUMIN.id, BASIL.id, false);

    expect(orders).toEqual({ [CUMIN.id]: 5 });
    expect(shownAfter(MIXED, orders)).toEqual([
      "allspice",
      "cumin",
      "basil",
      "flour",
      "sugar",
    ]);
  });

  it("places an unplaced target too, both just after the unplaced", () => {
    const after = storeOrdersFor(MIXED, SUGAR.id, ALLSPICE.id, true);
    const before = storeOrdersFor(MIXED, SUGAR.id, ALLSPICE.id, false);

    expect(shownAfter(MIXED, after)).toEqual([
      "cumin",
      "allspice",
      "sugar",
      "basil",
      "flour",
    ]);
    expect(shownAfter(MIXED, before)).toEqual([
      "cumin",
      "sugar",
      "allspice",
      "basil",
      "flour",
    ]);
    expect(Object.values(after).every((it) => it > 0)).toBe(true);
  });

  it("places both when nothing is placed yet", () => {
    const orders = storeOrdersFor(
      [ALLSPICE, CUMIN],
      CUMIN.id,
      ALLSPICE.id,
      true,
    );

    expect(shownAfter([ALLSPICE, CUMIN], orders)).toEqual([
      "allspice",
      "cumin",
    ]);
    expect(orders[ALLSPICE.id]).toBeGreaterThan(0);
  });

  it("never ties drops made one after another beside the same target", () => {
    const first = storeOrdersFor(PLACED, SUGAR.id, BASIL.id, true);
    const moved = PLACED.map((it) => ({
      ...it,
      storeOrder: first[it.id] ?? it.storeOrder,
    }));

    const second = storeOrdersFor(moved, FLOUR.id, BASIL.id, true);

    expect(shownAfter(moved, second)).toEqual(["basil", "flour", "sugar"]);
    expect(second[FLOUR.id]).not.toBe(first[SUGAR.id]);
  });
});

describe("storeMoveChanges", () => {
  it("changes nothing dropped on itself", () => {
    expect(storeMoveChanges(PLACED, FLOUR.id, FLOUR.id, true)).toBe(false);
  });

  it("changes nothing where a placed ingredient already is", () => {
    expect(storeMoveChanges(PLACED, FLOUR.id, BASIL.id, true)).toBe(false);
    expect(storeMoveChanges(PLACED, FLOUR.id, SUGAR.id, false)).toBe(false);
  });

  it("changes where an ingredient goes elsewhere", () => {
    expect(storeMoveChanges(PLACED, FLOUR.id, BASIL.id, false)).toBe(true);
    expect(storeMoveChanges(PLACED, BASIL.id, SUGAR.id, true)).toBe(true);
  });

  it("places an unplaced ingredient or target, even beside each other", () => {
    expect(storeMoveChanges(MIXED, CUMIN.id, ALLSPICE.id, true)).toBe(true);
    expect(storeMoveChanges(MIXED, BASIL.id, CUMIN.id, true)).toBe(true);
  });
});
