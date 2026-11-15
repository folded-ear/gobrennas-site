import { buildInMemoryCache } from "@/lib/apollo/build-in-memory-cache";
import { gql } from "@apollo/client";
import { beforeEach, describe, expect, it } from "vitest";
import { evictItem } from "./evict";

type Cache = ReturnType<typeof buildInMemoryCache>;

const DINNER = "10";
const LASAGNA_ITEM = "11";
const GARLIC_BREAD_ITEM = "12";
const SIDES_ITEM = "13";
const CAESAR_ITEM = "14";
const MILK_ITEM = "15";
const DESSERT_ITEM = "16";
const TIRAMISU_ITEM = "17";

const LASAGNA = recipe("21", "Lasagna");
const GARLIC_BREAD = recipe("22", "Garlic bread");
const CAESAR = recipe("23", "Caesar salad");
const PANCAKES = recipe("24", "Pancakes");
const MILK = { __typename: "PantryItem", id: "31", name: "Milk" };

function recipe(id: string, name: string) {
  return { __typename: "Recipe", id, name };
}

const WITH_INGREDIENTS = gql`
  query EvictTestPlan {
    planner {
      plans {
        id
        children {
          id
          ingredient {
            __typename
            id
            name
          }
          children {
            id
            ingredient {
              __typename
              id
              name
            }
            children {
              id
            }
          }
        }
      }
    }
  }
`;

const WITHOUT_INGREDIENTS = gql`
  query EvictTestBarePlan {
    planner {
      plan(id: "${DINNER}") {
        id
        children {
          id
          children {
            id
            children {
              id
            }
          }
        }
      }
    }
  }
`;

const HISTORY = gql`
  fragment EvictTestHistory on Recipe {
    id
    name
    plannedCount
    completed: plannedCount(status: COMPLETED)
    plannedHistory(last: 1, status: COMPLETED) {
      id
      doneAt
    }
  }
`;

const NAME = gql`
  fragment EvictTestName on Recipe {
    id
    name
  }
`;

const ITEM = gql`
  fragment EvictTestItem on PlanItem {
    id
  }
`;

function item(id: string, ingredient: object | null, children: object[]) {
  return { __typename: "PlanItem", id, ingredient, children };
}

function bare(id: string, children: object[]) {
  return { __typename: "PlanItem", id, children };
}

function seedHistory(cache: Cache, r: { id: string; name: string }) {
  cache.writeFragment({
    fragment: HISTORY,
    data: {
      ...r,
      __typename: "Recipe",
      plannedCount: 3,
      completed: 2,
      plannedHistory: [
        {
          __typename: "PlannedRecipeHistory",
          id: `h${r.id}`,
          doneAt: "2026-11-14T19:00:00Z",
        },
      ],
    },
  });
}

let cache: Cache;

const recipeId = (r: { id: string }) =>
  cache.identify({ __typename: "Recipe", id: r.id });

const historyOf = (r: { id: string }) =>
  cache.readFragment({ fragment: HISTORY, id: recipeId(r) });

const nameOf = (r: { id: string }) =>
  cache.readFragment<{ name: string }>({ fragment: NAME, id: recipeId(r) })
    ?.name;

const itemExists = (id: string) =>
  cache.readFragment({ fragment: ITEM, id: `PlanItem:${id}` }) !== null;

beforeEach(() => {
  cache = buildInMemoryCache();
  cache.writeQuery({
    query: WITH_INGREDIENTS,
    data: {
      planner: {
        __typename: "PlannerQuery",
        plans: [
          {
            __typename: "Plan",
            id: DINNER,
            children: [
              item(LASAGNA_ITEM, LASAGNA, [
                item(GARLIC_BREAD_ITEM, GARLIC_BREAD, []),
              ]),
              item(SIDES_ITEM, null, [item(CAESAR_ITEM, CAESAR, [])]),
              item(MILK_ITEM, MILK, []),
            ],
          },
        ],
      },
    },
  });
  for (const r of [LASAGNA, GARLIC_BREAD, CAESAR, PANCAKES])
    seedHistory(cache, r);
});

describe("evictItem", () => {
  it("evicts a removed recipe's history, and its nested recipes'", () => {
    evictItem(cache, LASAGNA_ITEM);

    expect(itemExists(LASAGNA_ITEM)).toBe(false);
    expect(itemExists(GARLIC_BREAD_ITEM)).toBe(false);
    expect(historyOf(LASAGNA)).toBeNull();
    expect(historyOf(GARLIC_BREAD)).toBeNull();
    expect(nameOf(LASAGNA)).toBe("Lasagna");
    expect(nameOf(GARLIC_BREAD)).toBe("Garlic bread");
    expect(historyOf(CAESAR)).not.toBeNull();
  });

  it("evicts the history of recipes under a removed non-recipe item", () => {
    evictItem(cache, SIDES_ITEM);

    expect(itemExists(CAESAR_ITEM)).toBe(false);
    expect(historyOf(CAESAR)).toBeNull();
    expect(historyOf(LASAGNA)).not.toBeNull();
  });

  it("leaves every recipe's history alone for a non-recipe item", () => {
    evictItem(cache, MILK_ITEM);

    expect(itemExists(MILK_ITEM)).toBe(false);
    for (const r of [LASAGNA, GARLIC_BREAD, CAESAR, PANCAKES])
      expect(historyOf(r)).not.toBeNull();
  });

  it("still evicts the children of an item cached without its ingredient", () => {
    cache.writeQuery({
      query: WITHOUT_INGREDIENTS,
      data: {
        planner: {
          __typename: "PlannerQuery",
          plan: {
            __typename: "Plan",
            id: DINNER,
            children: [bare(DESSERT_ITEM, [bare(TIRAMISU_ITEM, [])])],
          },
        },
      },
    });

    evictItem(cache, DESSERT_ITEM);

    expect(itemExists(DESSERT_ITEM)).toBe(false);
    expect(itemExists(TIRAMISU_ITEM)).toBe(false);
  });
});
