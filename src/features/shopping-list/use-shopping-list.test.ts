import { PlanItemStatus } from "@/__generated__/graphql";
import { act, buildInMemoryCache, renderHook } from "@/test";
import { describe, expect, it } from "vitest";
import { BASIL, plan, seedItem, SUGAR } from "./fixtures";
import { ShoppingItem, ShoppingPlan } from "./model";
import { useShoppingList } from "./use-shopping-list";

const { NEEDED, ACQUIRED } = PlanItemStatus;

/** Weeknights: sugar and basil, at the given statuses. */
function weeknights(
  sugar: PlanItemStatus,
  basil: PlanItemStatus = NEEDED,
): ShoppingPlan {
  const cache = buildInMemoryCache();
  return plan(
    "7",
    "Weeknights",
    "#F57F17",
    ["s", "b"],
    [
      seedItem(cache, {
        id: "s",
        name: "sugar",
        parent: "7",
        pantry: SUGAR,
        status: sugar,
      }),
      seedItem(cache, {
        id: "b",
        name: "basil",
        parent: "7",
        pantry: BASIL,
        status: basil,
      }),
    ],
  );
}

const PARTY = plan("9", "Party", "#1E88E5", [], []);

function names(items: readonly ShoppingItem[]): string[] {
  return items.map((it) => it.ingredient.name);
}

function renderShoppingList(plans: readonly ShoppingPlan[]) {
  return renderHook(({ plans }) => useShoppingList(plans), {
    initialProps: { plans },
  });
}

describe("useShoppingList", () => {
  it("slots every row by its status at first", () => {
    const { result } = renderShoppingList([weeknights(ACQUIRED)]);

    expect(names(result.current.list.needed.items)).toEqual(["basil"]);
    expect(names(result.current.list.acquired.items)).toEqual(["sugar"]);
  });

  it("holds a row whose status flips where it was, until a sweep", () => {
    const { result, rerender } = renderShoppingList([weeknights(NEEDED)]);

    rerender({ plans: [weeknights(ACQUIRED)] });

    expect(names(result.current.list.needed.items)).toEqual(["sugar", "basil"]);
    expect(result.current.list.needed.items[0].countsAs).toBe(ACQUIRED);

    act(() => result.current.sweep());

    expect(names(result.current.list.acquired.items)).toEqual(["sugar"]);
  });

  it("holds both ways", () => {
    const { result, rerender } = renderShoppingList([
      weeknights(NEEDED, ACQUIRED),
    ]);

    rerender({ plans: [weeknights(ACQUIRED, NEEDED)] });

    expect(names(result.current.list.needed.items)).toEqual(["sugar"]);
    expect(names(result.current.list.acquired.items)).toEqual(["basil"]);
  });

  it("lets a row go when its status flips back", () => {
    const { result, rerender } = renderShoppingList([weeknights(NEEDED)]);
    rerender({ plans: [weeknights(ACQUIRED)] });

    rerender({ plans: [weeknights(NEEDED)] });
    act(() => result.current.sweep());

    expect(names(result.current.list.needed.items)).toEqual(["sugar", "basil"]);
  });

  it("sweeps when the window loses focus", () => {
    const { result, rerender } = renderShoppingList([weeknights(NEEDED)]);
    rerender({ plans: [weeknights(ACQUIRED)] });

    act(() => {
      window.dispatchEvent(new Event("blur"));
    });

    expect(names(result.current.list.acquired.items)).toEqual(["sugar"]);
  });

  it("starts over when the plans being shopped change", () => {
    const { result, rerender } = renderShoppingList([weeknights(NEEDED)]);
    rerender({ plans: [weeknights(ACQUIRED)] });

    rerender({ plans: [weeknights(ACQUIRED), PARTY] });

    expect(names(result.current.list.acquired.items)).toEqual(["sugar"]);
  });
});
