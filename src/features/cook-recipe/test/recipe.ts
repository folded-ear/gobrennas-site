import { PlanItemStatus } from "@/__generated__/graphql";
import type { CookQuery } from "@/screens/__generated__/cook.generated";
import type { Unmasked } from "@apollo/client";
import type { CookItem } from "../model";

export type Item = Unmasked<CookItem>;
export function item(
  id: string,
  name: string,
  overrides: Partial<Item> = {},
): Item {
  return {
    __typename: "PlanItem",
    id,
    name,
    status: PlanItemStatus.NEEDED,
    pendingStatus: null,
    inert: false,
    notes: null,
    preparation: null,
    aggregate: null,
    quantity: null,
    ingredient: null,
    parent:
      id === "pie"
        ? { __typename: "Plan", id: "7" }
        : { __typename: "PlanItem", id: "pie" },
    plan: { __typename: "Plan", id: "7" },
    bucket: null,
    children: [],
    components: [],
    ...overrides,
  };
}
export const ref = (id: string) => ({ __typename: "PlanItem" as const, id });
export const savedRecipe: Extract<
  NonNullable<Item["ingredient"]>,
  { __typename: "Recipe" }
> = {
  __typename: "Recipe",
  id: "library-pie",
  name: "Apple pie",
  directions: "Bake the original pie.\n\nLet cool before slicing.",
  externalUrl: "https://example.test/apple-pie",
  yield: 8,
  totalTime: 80,
  calories: 300,
  labels: ["Dessert"],
  photo: null,
  sections: [{ __typename: "Section", id: "library-crust" }],
};
export const pie = item("pie", "Holiday apple pie", {
  parent: { __typename: "Plan", id: "7" },
  ingredient: savedRecipe,
  quantity: { __typename: "Quantity", quantity: 2, units: null },
  children: [ref("apples"), ref("salt"), ref("crust")],
  components: [ref("apples"), ref("crust")],
});
export const apples = item("apples", "4 cups apples, sliced", {
  ingredient: { __typename: "PantryItem", id: "apple", name: "apples" },
  quantity: {
    __typename: "Quantity",
    quantity: 4,
    units: { __typename: "UnitOfMeasure", id: "cup", name: "cup" },
  },
  preparation: "sliced",
});
export const crust = item("crust", "Crust for Friday", {
  // Moved out for advance preparation, but still a component of the pie.
  parent: { __typename: "Plan", id: "7" },
  ingredient: {
    ...savedRecipe,
    id: "library-crust",
    name: "Crust",
    directions: "Chill the dough.",
    yield: null,
    sections: [],
  },
  children: [ref("flour")],
  components: [ref("flour")],
});
export const ingredients = [
  apples,
  item("salt", "a pinch of mystery spice"),
  crust,
  item("flour", "3 cups flour", {
    parent: ref("crust"),
    ingredient: { __typename: "PantryItem", id: "flour", name: "flour" },
    quantity: {
      __typename: "Quantity",
      quantity: 3,
      units: { __typename: "UnitOfMeasure", id: "cup", name: "cup" },
    },
  }),
];
export function cookData(
  items: Item[] = [pie, ...ingredients],
  mine = true,
): Unmasked<CookQuery> {
  return {
    planner: {
      __typename: "PlannerQuery",
      plan: {
        __typename: "Plan",
        id: "7",
        name: "Holiday dinner",
        mine,
        grants: [],
        children: items
          .filter((entry) => entry.parent?.__typename === "Plan")
          .map((entry) => ref(entry.id)),
        buckets: [],
        updatedSince: items,
      },
    },
  };
}
