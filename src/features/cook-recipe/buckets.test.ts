import { PlanItemStatus } from "@/__generated__/graphql";
import { describe, expect, it } from "vitest";
import { buildCookBuckets } from "./buckets";
import {
  bucketsPlan,
  DINNER_BUCKET_IDS,
  holidayDinner,
  holidayItems,
  holidayLunch,
  weeknightDinner,
  weeknightItems,
} from "./test/buckets";

const PLANS = [
  bucketsPlan(holidayItems, [holidayDinner, holidayLunch]),
  bucketsPlan(weeknightItems, [weeknightDinner]),
];

function titles(sections: readonly { title: string }[]) {
  return sections.map((section) => section.title);
}

describe("buildCookBuckets", () => {
  it("takes what the buckets hold directly as its roots, in plan order", () => {
    const cooked = buildCookBuckets(PLANS, DINNER_BUCKET_IDS);

    expect([...(cooked?.rootIds ?? [])]).toEqual(["pie", "rolls", "tacos"]);
  });

  it("lists its roots as what it's made of", () => {
    const cooked = buildCookBuckets(PLANS, DINNER_BUCKET_IDS);

    expect(cooked?.recipe.main.ingredients).toHaveLength(3);
    expect(cooked?.recipe.main.item).toBeUndefined();
  });

  it("gives each root worth one a section, with everything below it after", () => {
    const cooked = buildCookBuckets(PLANS, DINNER_BUCKET_IDS);

    expect(titles(cooked?.recipe.sections ?? [])).toEqual([
      "Holiday apple pie",
      "Crust for Friday",
      "Tacos",
    ]);
  });

  it("leaves out what other buckets hold", () => {
    const cooked = buildCookBuckets(PLANS, [holidayDinner.id]);

    expect([...(cooked?.rootIds ?? [])]).toEqual(["pie", "rolls"]);
  });

  it("leaves out deleted items", () => {
    const cooked = buildCookBuckets(
      [
        bucketsPlan(
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

    expect([...(cooked?.rootIds ?? [])]).toEqual(["pie"]);
  });

  it("is labelled by its first bucket's name and their date", () => {
    const cooked = buildCookBuckets(PLANS, DINNER_BUCKET_IDS);

    expect(cooked?.label).toMatch(/^Dinner – .*Oct 6/);
  });

  it("is labelled by just the day when its buckets are unnamed", () => {
    const unnamed = { ...holidayDinner, name: null };

    const cooked = buildCookBuckets(
      [bucketsPlan(holidayItems, [unnamed])],
      [unnamed.id],
    );

    expect(cooked?.label).toMatch(/^\w+, Oct 6$/);
  });

  it("gives nothing when its buckets hold nothing", () => {
    expect(buildCookBuckets(PLANS, ["gone"])).toBeUndefined();
  });
});
