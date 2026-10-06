import type { CookBucketQuery } from "@/screens/__generated__/cook-bucket.generated";
import type { Unmasked } from "@apollo/client";
import type { CookBucket, MealPlan } from "../meal";
import { ingredients, item, Item, pie, ref } from "./recipe";

const HOLIDAYS_PLAN = { __typename: "Plan", id: "7" } as const;
const WEEKNIGHTS_PLAN = { __typename: "Plan", id: "9" } as const;

const bucketRef = (id: string) => ({ __typename: "PlanBucket" as const, id });

export const holidayDinner: CookBucket = {
  __typename: "PlanBucket",
  id: "hDinner",
  name: "Dinner",
  date: "2026-10-06",
};
export const holidayLunch: CookBucket = {
  __typename: "PlanBucket",
  id: "hLunch",
  name: "Lunch",
  date: "2026-10-06",
};
export const weeknightDinner: CookBucket = {
  __typename: "PlanBucket",
  id: "wDinner",
  name: " dinner ",
  date: "2026-10-06",
};
export const DINNER_BUCKET_IDS = [holidayDinner.id, weeknightDinner.id];

// Pie and rolls are in dinner directly; the crust is the pie's, moved out.
export const holidayItems: Item[] = [
  { ...pie, bucket: bucketRef(holidayDinner.id) },
  ...ingredients,
  item("rolls", "Dinner rolls", {
    parent: HOLIDAYS_PLAN,
    bucket: bucketRef(holidayDinner.id),
  }),
  item("soup", "Lunch soup", {
    parent: HOLIDAYS_PLAN,
    bucket: bucketRef(holidayLunch.id),
    notes: "Simmer gently.",
  }),
];

// The salsa is in dinner too, but already below the tacos.
export const weeknightItems: Item[] = [
  item("tacos", "Tacos", {
    parent: WEEKNIGHTS_PLAN,
    plan: WEEKNIGHTS_PLAN,
    bucket: bucketRef(weeknightDinner.id),
    children: [ref("salsa")],
    components: [ref("salsa")],
  }),
  item("salsa", "Salsa", {
    parent: ref("tacos"),
    plan: WEEKNIGHTS_PLAN,
    bucket: bucketRef(weeknightDinner.id),
  }),
];

function rootIdsOf(items: readonly Item[]): string[] {
  return items
    .filter((entry) => entry.parent?.__typename === "Plan")
    .map((entry) => entry.id);
}

export function mealPlan(
  items: readonly Item[],
  buckets: readonly CookBucket[],
): MealPlan {
  return { rootIds: rootIdsOf(items), items, buckets };
}

export function cookBucketData(
  id: string,
  name: string,
  items: Item[],
  buckets: CookBucket[],
  mine = true,
): Unmasked<CookBucketQuery> {
  return {
    planner: {
      __typename: "PlannerQuery",
      plan: {
        __typename: "Plan",
        id,
        name,
        mine,
        grants: [],
        children: rootIdsOf(items).map(ref),
        buckets,
        updatedSince: items,
      },
    },
  };
}
