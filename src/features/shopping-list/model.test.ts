import { PlanItemStatus } from "@/__generated__/graphql";
import { describe, expect, it } from "vitest";
import {
  buildShoppingList,
  ShoppingItem,
  ShoppingPlan,
  ShoppingPlanItem,
  Source,
  Unit,
} from "./model";

const CUP: Unit = { id: "u1", name: "cup" };
const TBSP: Unit = { id: "u2", name: "Tbsp" };
const TSP: Unit = { id: "u3", name: "tsp" };

const FLOUR = { id: "p1", name: "flour", storeOrder: 20 };
const SUGAR = { id: "p2", name: "sugar", storeOrder: 10 };
const BASIL = { id: "p3", name: "basil", storeOrder: 30 };
const EGGS = { id: "p4", name: "eggs", storeOrder: 30 };
const SALT = { id: "p5", name: "salt", storeOrder: 40 };

type Pantry = { id: string; name: string; storeOrder: number };

type ItemSpec = {
  readonly id: string;
  readonly name?: string;
  readonly children?: readonly string[];
  readonly status?: PlanItemStatus;
  readonly quantity?: number | null;
  readonly unit?: Unit | null;
  readonly pantry?: Pantry;
  readonly recipe?: string;
};

function item({
  id,
  name,
  children = [],
  status = PlanItemStatus.NEEDED,
  quantity = null,
  unit = null,
  pantry,
  recipe,
}: ItemSpec): ShoppingPlanItem {
  return {
    __typename: "PlanItem",
    id,
    name: name ?? id,
    bucket: null,
    children: children.map((childId) => ({
      __typename: "PlanItem",
      id: childId,
    })),
    status,
    quantity:
      quantity === null
        ? null
        : {
            __typename: "Quantity",
            quantity,
            units:
              unit === null ? null : { __typename: "UnitOfMeasure", ...unit },
          },
    ingredient: pantry
      ? { __typename: "PantryItem", ...pantry }
      : recipe
        ? { __typename: "Recipe", id: recipe, name: recipe }
        : null,
  };
}

function plan(
  id: string,
  rootIds: readonly string[],
  items: readonly ShoppingPlanItem[],
): ShoppingPlan {
  return {
    id,
    name: `Plan ${id}`,
    color: "#F57F17",
    rootIds,
    items,
    buckets: [],
  };
}

function names(items: readonly ShoppingItem[]): string[] {
  return items.map((it) => it.ingredient.name);
}

function ids(sources: readonly Source[]): string[] {
  return sources.map((it) => it.item.id);
}

function only(items: readonly ShoppingItem[]): ShoppingItem {
  expect(items).toHaveLength(1);
  return items[0];
}

describe("buildShoppingList", () => {
  it("gathers leaves, skipping parents and recipes without ingredients", () => {
    const list = buildShoppingList([
      plan(
        "1",
        ["pie", "pizza"],
        [
          item({ id: "pie", children: ["crust"], recipe: "r1" }),
          item({ id: "crust", children: ["flour"] }),
          item({ id: "flour", quantity: 2, unit: CUP, pantry: FLOUR }),
          item({ id: "pizza", recipe: "r2" }),
        ],
      ),
    ]);

    expect(names(list.needed.items)).toEqual(["flour"]);
    expect(list.needed.unresolved).toEqual([]);
    expect(list.acquired.items).toEqual([]);
  });

  it("merges plan items by ingredient across recipes and plans", () => {
    const list = buildShoppingList([
      plan(
        "1",
        ["a", "b"],
        [
          item({
            id: "a",
            name: "2 cups flour",
            quantity: 2,
            unit: CUP,
            pantry: FLOUR,
          }),
          item({
            id: "b",
            name: "1 cup AP flour",
            quantity: 1,
            unit: CUP,
            pantry: FLOUR,
          }),
        ],
      ),
      plan(
        "2",
        ["c"],
        [
          item({
            id: "c",
            name: "flour, sifted",
            quantity: 3,
            unit: CUP,
            pantry: FLOUR,
          }),
        ],
      ),
    ]);

    const flour = only(list.needed.items);
    expect(flour.ingredient).toEqual(FLOUR);
    expect(flour.amounts).toEqual([{ quantity: 6, unit: CUP }]);
    expect(ids(flour.sources)).toEqual(["a", "b", "c"]);
    expect(flour.plans.map((it) => it.id)).toEqual(["1", "2"]);
  });

  it("keeps apart plan items with the same text but different ingredients", () => {
    const list = buildShoppingList([
      plan(
        "1",
        ["a", "b"],
        [
          item({ id: "a", name: "sugar", pantry: SUGAR }),
          item({ id: "b", name: "sugar", pantry: FLOUR }),
        ],
      ),
    ]);

    expect(names(list.needed.items)).toEqual(["sugar", "flour"]);
  });

  it("sums each unit apart, with no unit as its own amount", () => {
    const list = buildShoppingList([
      plan(
        "1",
        ["a", "b", "c", "d"],
        [
          item({ id: "a", quantity: 2, unit: CUP, pantry: FLOUR }),
          item({ id: "b", quantity: 3, unit: TBSP, pantry: FLOUR }),
          item({ id: "c", quantity: 1, unit: CUP, pantry: FLOUR }),
          item({ id: "d", quantity: 2, pantry: FLOUR }),
        ],
      ),
    ]);

    expect(only(list.needed.items).amounts).toEqual([
      { quantity: 3, unit: CUP },
      { quantity: 3, unit: TBSP },
      { quantity: 2, unit: null },
    ]);
  });

  it("counts a missing quantity as one, and a zero as nothing", () => {
    const list = buildShoppingList([
      plan(
        "1",
        ["a", "b", "c"],
        [
          item({ id: "a", pantry: EGGS }),
          item({ id: "b", quantity: 2, pantry: EGGS }),
          item({ id: "c", quantity: 0, pantry: EGGS }),
        ],
      ),
    ]);

    const eggs = only(list.needed.items);
    expect(eggs.amounts).toEqual([{ quantity: 3, unit: null }]);
    expect(ids(eggs.sources)).toEqual(["a", "b", "c"]);
  });

  it("lists items with no ingredient apart, each in its own status's region", () => {
    const list = buildShoppingList([
      plan(
        "1",
        ["a", "b", "c", "d"],
        [
          item({ id: "a", name: "paper towels" }),
          item({ id: "b", name: "paper towels" }),
          item({ id: "c", name: "foil", status: PlanItemStatus.ACQUIRED }),
          item({ id: "d", name: "candles", quantity: 0 }),
        ],
      ),
    ]);

    expect(list.needed.items).toEqual([]);
    expect(ids(list.needed.unresolved)).toEqual(["a", "b"]);
    expect(ids(list.acquired.unresolved)).toEqual(["c", "d"]);
  });

  it("sums only what's needed while anything is, but keeps every plan item", () => {
    const list = buildShoppingList([
      plan(
        "1",
        ["sauce", "tea"],
        [
          item({ id: "sauce", children: ["s1"] }),
          item({ id: "s1", quantity: 1, unit: TSP, pantry: SUGAR }),
          item({ id: "tea", children: ["t1"] }),
          item({
            id: "t1",
            quantity: 2,
            unit: TBSP,
            pantry: SUGAR,
            status: PlanItemStatus.ACQUIRED,
          }),
        ],
      ),
    ]);

    const sugar = only(list.needed.items);
    expect(sugar.amounts).toEqual([{ quantity: 1, unit: TSP }]);
    expect(ids(sugar.sources)).toEqual(["s1", "t1"]);
    expect(list.acquired.items).toEqual([]);
  });

  it("sums everything once all of it is acquired", () => {
    const list = buildShoppingList([
      plan(
        "1",
        ["a", "b"],
        [
          item({
            id: "a",
            quantity: 1,
            unit: TSP,
            pantry: SUGAR,
            status: PlanItemStatus.ACQUIRED,
          }),
          item({
            id: "b",
            quantity: 2,
            unit: TSP,
            pantry: SUGAR,
            status: PlanItemStatus.ACQUIRED,
          }),
        ],
      ),
    ]);

    expect(list.needed.items).toEqual([]);
    expect(only(list.acquired.items).amounts).toEqual([
      { quantity: 3, unit: TSP },
    ]);
  });

  it("counts a zero quantity as acquired, whatever its status", () => {
    const list = buildShoppingList([
      plan("1", ["a"], [item({ id: "a", quantity: 0, pantry: SALT })]),
    ]);

    expect(list.needed.items).toEqual([]);
    const salt = only(list.acquired.items);
    expect(salt.amounts).toEqual([]);
    expect(salt.implicit).toBe(false);
  });

  it("hides the quantity of one plan item that gives none", () => {
    const list = buildShoppingList([
      plan(
        "1",
        ["a", "b"],
        [
          item({ id: "a", pantry: BASIL }),
          item({ id: "b", quantity: 1, pantry: EGGS }),
        ],
      ),
    ]);

    const [basil, eggs] = list.needed.items;
    expect(basil.implicit).toBe(true);
    expect(eggs.implicit).toBe(false);
    expect(eggs.amounts).toEqual([{ quantity: 1, unit: null }]);
  });

  it("shows the quantity of several plan items, even implicit ones", () => {
    const list = buildShoppingList([
      plan(
        "1",
        ["a", "b", "c", "d"],
        [
          item({ id: "a", pantry: BASIL }),
          item({ id: "b", pantry: BASIL }),
          item({ id: "c", pantry: EGGS }),
          item({ id: "d", pantry: EGGS, status: PlanItemStatus.ACQUIRED }),
        ],
      ),
    ]);

    const [basil, eggs] = list.needed.items;
    expect(basil.implicit).toBe(false);
    expect(basil.amounts).toEqual([{ quantity: 2, unit: null }]);
    expect(eggs.implicit).toBe(false);
    expect(eggs.amounts).toEqual([{ quantity: 1, unit: null }]);
  });

  it("orders by store order, then name", () => {
    const list = buildShoppingList([
      plan(
        "1",
        ["a", "b", "c", "d"],
        [
          item({ id: "a", pantry: EGGS }),
          item({ id: "b", pantry: FLOUR }),
          item({ id: "c", pantry: BASIL }),
          item({ id: "d", pantry: SUGAR }),
        ],
      ),
    ]);

    expect(names(list.needed.items)).toEqual([
      "sugar",
      "flour",
      "basil",
      "eggs",
    ]);
  });

  it("gives each plan item's ancestors nearest first, and its plan", () => {
    const list = buildShoppingList([
      plan(
        "1",
        ["dinner"],
        [
          item({ id: "dinner", name: "Dinner", children: ["sauce"] }),
          item({ id: "sauce", name: "Spag sauce", children: ["s1"] }),
          item({ id: "s1", pantry: SUGAR }),
        ],
      ),
    ]);

    const [source] = only(list.needed.items).sources;
    expect(source.ancestors.map((it) => it.name)).toEqual([
      "Spag sauce",
      "Dinner",
    ]);
    expect(source.plan).toEqual({ id: "1", name: "Plan 1", color: "#F57F17" });
  });
});
