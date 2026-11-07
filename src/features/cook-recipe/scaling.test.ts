import { describe, expect, it } from "vitest";
import { scaledQuantities, type ScalingItem } from "./scaling";

function item(
  id: string,
  quantity: number | null,
  children: string[] = [],
  overrides: Partial<ScalingItem> = {},
): ScalingItem {
  return {
    id,
    status: "NEEDED",
    quantity: quantity === null ? null : { quantity },
    children: children.map((id) => ({ id })),
    components: [],
    ingredient: null,
    ...overrides,
  };
}

describe("scaledQuantities", () => {
  it("scales edited amounts and moved prep once, preserving subrecipe contents and unknown quantities", () => {
    const items = [
      item("chili", 2, ["beans", "sauce", "prep", "note"], {
        ingredient: {
          __typename: "Recipe",
          id: "chili-recipe",
          sectionOf: null,
        },
        components: [{ id: "beans" }, { id: "prep" }],
      }),
      item("beans", 5),
      item("prep", null, ["onion"], {
        ingredient: {
          __typename: "Recipe",
          id: "prep-recipe",
          sectionOf: { id: "another-recipe" },
        },
      }),
      item("onion", 3),
      item("sauce", 4, ["garlic"], {
        ingredient: { __typename: "Recipe", id: "sauce-recipe" },
      }),
      item("garlic", 2),
      item("note", null),
    ];
    const before = structuredClone(items);
    const byId = new Map(items.map((item) => [item.id, item]));
    expect(scaledQuantities("chili", 1.5, (id) => byId.get(id))).toEqual({
      chili: 3,
      beans: 7.5,
      onion: 4.5,
      sauce: 6,
    });
    expect(items).toEqual(before);
  });
  it("ignores deleted ingredients and guards overflow", () => {
    const root = item("chili", 1, ["deleted"], {
      components: [{ id: "chili" }],
    });
    const deleted = item("deleted", 5, [], { status: "DELETED" });
    expect(
      scaledQuantities("chili", 2, (id) => (id === root.id ? root : deleted)),
    ).toEqual({ chili: 2 });
    expect(() =>
      scaledQuantities("chili", Number.MAX_VALUE, () => item("chili", 2)),
    ).toThrow();
  });
});
