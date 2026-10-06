import { PlanItemStatus } from "@/__generated__/graphql";
import { describe, expect, it } from "vitest";
import { buildCookMeal } from "./meal";
import {
  DINNER_BUCKET_IDS,
  holidayDinner,
  holidayItems,
  holidayLunch,
  mealPlan,
  weeknightDinner,
  weeknightItems,
} from "./test/meal";

const PLANS = [
  mealPlan(holidayItems, [holidayDinner, holidayLunch]),
  mealPlan(weeknightItems, [weeknightDinner]),
];

function titles(sections: readonly { title: string }[]) {
  return sections.map((section) => section.title);
}

describe("buildCookMeal", () => {
  it("takes what the buckets hold directly as its courses, in plan order", () => {
    const meal = buildCookMeal(PLANS, DINNER_BUCKET_IDS);

    expect([...(meal?.courseIds ?? [])]).toEqual(["pie", "rolls", "tacos"]);
  });

  it("lists its courses as what it's made of", () => {
    const meal = buildCookMeal(PLANS, DINNER_BUCKET_IDS);

    expect(meal?.recipe.main.ingredients).toHaveLength(3);
    expect(meal?.recipe.main.item).toBeUndefined();
  });

  it("gives each course worth one a section, with everything below it after", () => {
    const meal = buildCookMeal(PLANS, DINNER_BUCKET_IDS);

    expect(titles(meal?.recipe.sections ?? [])).toEqual([
      "Holiday apple pie",
      "Crust for Friday",
      "Tacos",
    ]);
  });

  it("leaves out what other buckets hold", () => {
    const meal = buildCookMeal(PLANS, [holidayDinner.id]);

    expect([...(meal?.courseIds ?? [])]).toEqual(["pie", "rolls"]);
  });

  it("leaves out deleted items", () => {
    const meal = buildCookMeal(
      [
        mealPlan(
          holidayItems.map((entry) =>
            entry.id === "rolls"
              ? { ...entry, status: PlanItemStatus.DELETED }
              : entry,
          ),
          [holidayDinner],
        ),
      ],
      [holidayDinner.id],
    );

    expect([...(meal?.courseIds ?? [])]).toEqual(["pie"]);
  });

  it("is labelled by its first bucket's name and their date", () => {
    const meal = buildCookMeal(PLANS, DINNER_BUCKET_IDS);

    expect(meal?.label).toMatch(/^Dinner – .*Oct 6/);
  });

  it("is labelled by just the day when its buckets are unnamed", () => {
    const unnamed = { ...holidayDinner, name: null };

    const meal = buildCookMeal(
      [mealPlan(holidayItems, [unnamed])],
      [unnamed.id],
    );

    expect(meal?.label).toMatch(/^\w+, Oct 6$/);
  });

  it("is no meal when its buckets hold nothing", () => {
    expect(buildCookMeal(PLANS, ["gone"])).toBeUndefined();
  });
});
