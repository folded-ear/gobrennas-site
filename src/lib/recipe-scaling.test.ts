import { describe, expect, it } from "vitest";
import {
  scaledIngredientName,
  scaledQuantities,
  type ScalingItem,
} from "./recipe-scaling";

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

it.each([
  "1/2 cups beans, rinsed",
  "1 1/2 cups beans, rinsed",
  "½ cups beans, rinsed",
  "1½ cups beans, rinsed",
  "one and half cups beans, rinsed",
  "two cups beans, rinsed",
  "1 and 1⁄2 cups beans, rinsed",
  ".5 cups beans, rinsed",
])("updates only the leading quantity in %s", (name) => {
  expect(scaledIngredientName(name, 3)).toBe("3 cups beans, rinsed");
});
