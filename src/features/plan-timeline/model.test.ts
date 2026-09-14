import { describe, expect, it } from "vitest";
import {
  bucketSectionKey,
  buildSubtree,
  buildTimeline,
  PlanItemNode,
  sectionOfItems,
  TimelineBucketSection,
  TimelineDay,
  TimelineEntry,
  TimelineGap,
  TimelineItem,
  TimelinePlan,
  TimelineUnplanned,
  UNPLANNED_SECTION,
} from "./model";

const TODAY = "2026-09-09";

type ItemSpec = {
  readonly id: string;
  readonly name?: string;
  readonly bucket?: string;
  readonly children?: readonly string[];
};

function item({ id, name, bucket, children = [] }: ItemSpec): TimelineItem {
  return {
    __typename: "PlanItem",
    id,
    name: name ?? id,
    bucket: bucket ? { __typename: "PlanBucket", id: bucket } : null,
    children: children.map((childId) => ({
      __typename: "PlanItem",
      id: childId,
    })),
  };
}

function build(input: Partial<TimelinePlan>): readonly TimelineEntry[] {
  return buildTimeline({
    plans: [{ rootIds: [], items: [], buckets: [], ...input }],
    today: TODAY,
  });
}

function days(entries: readonly TimelineEntry[]): readonly TimelineDay[] {
  return entries.filter((e): e is TimelineDay => e.kind === "day");
}

function gaps(entries: readonly TimelineEntry[]): readonly TimelineGap[] {
  return entries.filter((e): e is TimelineGap => e.kind === "gap");
}

function bucketSections(
  entries: readonly TimelineEntry[],
): readonly TimelineBucketSection[] {
  return entries.filter((e): e is TimelineBucketSection => e.kind === "bucket");
}

function unplanned(entries: readonly TimelineEntry[]): TimelineUnplanned {
  const found = entries.find(
    (e): e is TimelineUnplanned => e.kind === "unplanned",
  );
  if (!found) throw new Error("No unplanned section");
  return found;
}

function dayOn(entries: readonly TimelineEntry[], date: string): TimelineDay {
  const found = days(entries).find((d) => d.date === date);
  if (!found) throw new Error(`No day for ${date}`);
  return found;
}

function bucketOn(
  entries: readonly TimelineEntry[],
  bucketId: string,
): TimelineBucketSection {
  const found = bucketSections(entries).find((b) =>
    b.bucketIds.includes(bucketId),
  );
  if (!found) throw new Error(`No bucket section for ${bucketId}`);
  return found;
}

function names(nodes: readonly PlanItemNode[]): readonly string[] {
  return nodes.map((n) => n.item.name);
}

describe("an item's date", () => {
  it("dates an item by its own bucket", () => {
    const entries = build({
      rootIds: ["dinner"],
      items: [
        item({ id: "dinner", name: "Thanksgiving dinner", bucket: "b1" }),
      ],
      buckets: [{ id: "b1", date: "2026-09-12", name: null }],
    });

    expect(names(dayOn(entries, "2026-09-12").roots)).toEqual([
      "Thanksgiving dinner",
    ]);
  });

  it("inherits the nearest ancestor's date", () => {
    const entries = build({
      rootIds: ["dinner"],
      items: [
        item({
          id: "dinner",
          name: "Thanksgiving dinner",
          bucket: "b1",
          children: ["pie"],
        }),
        item({ id: "pie", name: "Pumpkin pie", children: ["crust"] }),
        item({ id: "crust", name: "Pie crust" }),
      ],
      buckets: [{ id: "b1", date: "2026-09-12", name: null }],
    });

    const dinner = dayOn(entries, "2026-09-12").roots[0];
    expect(names(dinner.children)).toEqual(["Pumpkin pie"]);
  });

  it("walks past a bucket that carries no date", () => {
    const entries = build({
      rootIds: ["dinner"],
      items: [
        item({
          id: "dinner",
          name: "Thanksgiving dinner",
          bucket: "dated",
          children: ["pie"],
        }),
        item({ id: "pie", name: "Pumpkin pie", bucket: "undated" }),
      ],
      buckets: [
        { id: "dated", date: "2026-09-12", name: null },
        { id: "undated", date: null, name: null },
      ],
    });

    const dinner = dayOn(entries, "2026-09-12").roots[0];
    expect(names(dinner.children)).toEqual(["Pumpkin pie"]);
  });

  it("falls back to unplanned when no ancestor is bucketed", () => {
    const entries = build({
      rootIds: ["dinner"],
      items: [item({ id: "dinner", name: "Thanksgiving dinner" })],
    });

    expect(names(unplanned(entries).roots)).toEqual(["Thanksgiving dinner"]);
    expect(names(dayOn(entries, TODAY).roots)).toEqual([]);
  });
});

describe("what the timeline shows", () => {
  it("shows a top-level item with no bucket and no children", () => {
    const entries = build({
      rootIds: ["shop"],
      items: [item({ id: "shop", name: "Go shopping" })],
    });

    expect(names(unplanned(entries).roots)).toEqual(["Go shopping"]);
  });

  it("shows a bucketed descendant", () => {
    const entries = build({
      rootIds: ["dinner"],
      items: [
        item({ id: "dinner", name: "Thanksgiving dinner", children: ["pie"] }),
        item({ id: "pie", name: "Pumpkin pie", bucket: "undated" }),
      ],
      buckets: [{ id: "undated", date: null, name: null }],
    });

    const dinner = unplanned(entries).roots[0];
    expect(names(dinner.children)).toEqual(["Pumpkin pie"]);
  });

  it("shows a descendant that has children of its own", () => {
    const entries = build({
      rootIds: ["dinner"],
      items: [
        item({ id: "dinner", name: "Thanksgiving dinner", children: ["pie"] }),
        item({ id: "pie", name: "Pumpkin pie", children: ["crust"] }),
        item({ id: "crust", name: "Pie crust" }),
      ],
    });

    const dinner = unplanned(entries).roots[0];
    expect(names(dinner.children)).toEqual(["Pumpkin pie"]);
  });

  it("hides a descendant leaf with no bucket", () => {
    const entries = build({
      rootIds: ["dinner"],
      items: [
        item({
          id: "dinner",
          name: "Thanksgiving dinner",
          children: ["pie", "turkey"],
        }),
        item({ id: "pie", name: "Pumpkin pie", children: ["crust"] }),
        item({ id: "crust", name: "Pie crust" }),
        item({ id: "turkey", name: "Roast turkey" }),
      ],
    });

    const dinner = unplanned(entries).roots[0];
    expect(names(dinner.children)).toEqual(["Pumpkin pie"]);
    expect(names(dinner.children[0].children)).toEqual([]);
  });
});

describe("nesting", () => {
  it("roots an overriding descendant in its own day, not under its parent", () => {
    const entries = build({
      rootIds: ["dinner"],
      items: [
        item({
          id: "dinner",
          name: "Thanksgiving dinner",
          bucket: "bDinner",
          children: ["pie", "turkey"],
        }),
        item({
          id: "pie",
          name: "Pumpkin pie",
          children: ["crust", "pumpkin"],
        }),
        item({ id: "crust", name: "Pie crust" }),
        item({ id: "pumpkin", name: "Roast pumpkin", bucket: "bPumpkin" }),
        item({ id: "turkey", name: "Roast turkey" }),
      ],
      buckets: [
        { id: "bDinner", date: "2026-09-09", name: null },
        { id: "bPumpkin", date: "2026-09-12", name: null },
      ],
    });

    const dinner = dayOn(entries, "2026-09-09").roots;
    expect(names(dinner)).toEqual(["Thanksgiving dinner"]);
    expect(names(dinner[0].children)).toEqual(["Pumpkin pie"]);
    expect(names(dinner[0].children[0].children)).toEqual([]);

    expect(names(dayOn(entries, "2026-09-12").roots)).toEqual([
      "Roast pumpkin",
    ]);
  });

  it("keeps a descendant nested when its own bucket agrees on the date", () => {
    const entries = build({
      rootIds: ["dinner"],
      items: [
        item({
          id: "dinner",
          name: "Thanksgiving dinner",
          bucket: "bDinner",
          children: ["pie"],
        }),
        item({ id: "pie", name: "Pumpkin pie", bucket: "bPie" }),
      ],
      buckets: [
        { id: "bDinner", date: "2026-09-12", name: null },
        { id: "bPie", date: "2026-09-12", name: null },
      ],
    });

    const day = dayOn(entries, "2026-09-12");
    expect(names(day.roots)).toEqual(["Thanksgiving dinner"]);
    expect(names(day.roots[0].children)).toEqual(["Pumpkin pie"]);
  });

  it("keeps a descendant nested when its own bucket is the same named bucket", () => {
    const entries = build({
      rootIds: ["dinner"],
      items: [
        item({
          id: "dinner",
          name: "Thanksgiving dinner",
          bucket: "lunch",
          children: ["pie"],
        }),
        item({ id: "pie", name: "Pumpkin pie", bucket: "lunch" }),
      ],
      buckets: [{ id: "lunch", date: "2026-09-12", name: "Lunch" }],
    });

    const section = bucketOn(entries, "lunch");
    expect(names(section.roots)).toEqual(["Thanksgiving dinner"]);
    expect(names(section.roots[0].children)).toEqual(["Pumpkin pie"]);
  });
});

describe("ordering", () => {
  it("orders siblings by children, not by the descendants array", () => {
    const entries = build({
      rootIds: ["dinner"],
      items: [
        item({ id: "gravy", name: "Gravy", bucket: "undated" }),
        item({
          id: "dinner",
          name: "Thanksgiving dinner",
          children: ["pie", "turkey", "gravy"],
        }),
        item({ id: "turkey", name: "Roast turkey", bucket: "undated" }),
        item({ id: "pie", name: "Pumpkin pie", bucket: "undated" }),
      ],
      buckets: [{ id: "undated", date: null, name: null }],
    });

    const dinner = unplanned(entries).roots[0];
    expect(names(dinner.children)).toEqual([
      "Pumpkin pie",
      "Roast turkey",
      "Gravy",
    ]);
  });

  it("orders unplanned roots by the plan's own child order", () => {
    const entries = build({
      rootIds: ["dinner", "brunch"],
      items: [
        item({ id: "brunch", name: "Sunday brunch" }),
        item({ id: "dinner", name: "Thanksgiving dinner" }),
      ],
    });

    expect(names(unplanned(entries).roots)).toEqual([
      "Thanksgiving dinner",
      "Sunday brunch",
    ]);
  });

  it("skips a child id that is not among the descendants", () => {
    const entries = build({
      rootIds: ["dinner"],
      items: [
        item({
          id: "dinner",
          name: "Thanksgiving dinner",
          children: ["pie", "missing"],
        }),
        item({ id: "pie", name: "Pumpkin pie", bucket: "undated" }),
      ],
      buckets: [{ id: "undated", date: null, name: null }],
    });

    const dinner = unplanned(entries).roots[0];
    expect(names(dinner.children)).toEqual(["Pumpkin pie"]);
  });
});

describe("named bucket sections", () => {
  it("puts a dated, named bucket's items in their own section", () => {
    const entries = build({
      rootIds: ["dinner"],
      items: [item({ id: "dinner", name: "Lunch out", bucket: "lunch" })],
      buckets: [{ id: "lunch", date: "2026-09-14", name: "Lunch" }],
    });

    const section = bucketOn(entries, "lunch");
    expect(section).toMatchObject({ name: "Lunch", date: "2026-09-14" });
    expect(names(section.roots)).toEqual(["Lunch out"]);
  });

  it("shows a dated, named bucket's section right after that date's own", () => {
    const entries = build({
      buckets: [{ id: "lunch", date: "2026-09-14", name: "Lunch" }],
    });

    const dayIndex = entries.findIndex(
      (e) => e.kind === "day" && e.date === "2026-09-14",
    );
    expect(entries[dayIndex + 1]).toMatchObject({
      kind: "bucket",
      bucketIds: ["lunch"],
    });
  });

  it("keeps two named buckets on the same date in the plan's own order", () => {
    const entries = build({
      buckets: [
        { id: "dinner", date: "2026-09-14", name: "Dinner" },
        { id: "lunch", date: "2026-09-14", name: "Lunch" },
      ],
    });

    const dayIndex = entries.findIndex(
      (e) => e.kind === "day" && e.date === "2026-09-14",
    );
    expect(entries.slice(dayIndex + 1, dayIndex + 3)).toMatchObject([
      { kind: "bucket", bucketIds: ["dinner"] },
      { kind: "bucket", bucketIds: ["lunch"] },
    ]);
  });

  it("always shows a dated, named bucket's section, even with nothing in it", () => {
    const entries = build({
      buckets: [{ id: "lunch", date: "2026-09-14", name: "Lunch" }],
    });

    expect(names(bucketOn(entries, "lunch").roots)).toEqual([]);
  });

  it("always shows an undated, named bucket's section, even with nothing in it", () => {
    const entries = build({
      buckets: [{ id: "list", date: null, name: "Grocery list" }],
    });

    const section = bucketOn(entries, "list");
    expect(section).toMatchObject({ name: "Grocery list", date: null });
    expect(section.roots).toEqual([]);
  });

  it("puts an undated, named bucket's items in their own section", () => {
    const entries = build({
      rootIds: ["milk"],
      items: [item({ id: "milk", name: "Milk", bucket: "list" })],
      buckets: [{ id: "list", date: null, name: "Grocery list" }],
    });

    expect(names(bucketOn(entries, "list").roots)).toEqual(["Milk"]);
  });

  it("treats a bucket with neither a date nor a name as no bucket at all", () => {
    const entries = build({
      rootIds: ["shop"],
      items: [item({ id: "shop", name: "Go shopping", bucket: "empty" })],
      buckets: [{ id: "empty", date: null, name: null }],
    });

    expect(names(unplanned(entries).roots)).toEqual(["Go shopping"]);
    expect(bucketSections(entries)).toEqual([]);
  });

  it.each(["", "  "])("treats a bucket named %j as unnamed", (name) => {
    const entries = build({
      rootIds: ["mix"],
      items: [item({ id: "mix", name: "Spice mix", bucket: "blank" })],
      buckets: [{ id: "blank", date: "2026-09-14", name }],
    });

    expect(names(dayOn(entries, "2026-09-14").roots)).toEqual(["Spice mix"]);
    expect(bucketSections(entries)).toEqual([]);
  });
});

describe("buckets sharing a name and date", () => {
  it("shows them as one section, named as the first spells it", () => {
    const entries = build({
      rootIds: ["pie", "rolls"],
      items: [
        item({ id: "pie", name: "Pumpkin pie", bucket: "prep" }),
        item({ id: "rolls", name: "Dinner rolls", bucket: "prep2" }),
      ],
      buckets: [
        { id: "prep", date: "2026-09-14", name: "Day-before prep" },
        { id: "prep2", date: "2026-09-14", name: " day-before   PREP " },
      ],
    });

    expect(bucketSections(entries)).toHaveLength(1);
    const section = bucketOn(entries, "prep2");
    expect(section).toMatchObject({
      name: "Day-before prep",
      bucketIds: ["prep", "prep2"],
    });
    expect(names(section.roots)).toEqual(["Pumpkin pie", "Dinner rolls"]);
  });

  it("shows undated ones as one section too", () => {
    const entries = build({
      buckets: [
        { id: "list", date: null, name: "Grocery list" },
        { id: "list2", date: null, name: "grocery list" },
      ],
    });

    expect(bucketSections(entries)).toMatchObject([
      { bucketIds: ["list", "list2"] },
    ]);
  });

  it("keeps same-named buckets on different dates apart", () => {
    const entries = build({
      buckets: [
        { id: "mon", date: "2026-09-14", name: "Lunch" },
        { id: "tue", date: "2026-09-15", name: "Lunch" },
        { id: "someday", date: null, name: "Lunch" },
      ],
    });

    expect(bucketSections(entries)).toHaveLength(3);
  });
});

describe("several plans", () => {
  const HOLIDAYS: TimelinePlan = {
    rootIds: ["dinner", "tidy"],
    items: [
      item({ id: "dinner", name: "Thanksgiving dinner", bucket: "hSat" }),
      item({ id: "tidy", name: "Tidy up" }),
      item({ id: "brine", name: "Brine turkey", bucket: "hPrep" }),
    ],
    buckets: [
      { id: "hSat", date: "2026-09-12", name: null },
      { id: "hPrep", date: "2026-09-11", name: "Prep" },
    ],
  };
  const WEEKNIGHTS: TimelinePlan = {
    rootIds: ["tacos", "stock", "laundry"],
    items: [
      item({ id: "tacos", name: "Tacos", bucket: "wSat" }),
      item({ id: "stock", name: "Stock", bucket: "wPrep" }),
      item({ id: "laundry", name: "Laundry" }),
    ],
    buckets: [
      { id: "wSat", date: "2026-09-12", name: null },
      { id: "wPrep", date: "2026-09-11", name: "prep" },
    ],
  };

  function buildBoth() {
    return buildTimeline({
      plans: [
        { ...HOLIDAYS, rootIds: [...HOLIDAYS.rootIds, "brine"] },
        WEEKNIGHTS,
      ],
      today: TODAY,
    });
  }

  it("puts every plan's items on a shared day, in plan order", () => {
    expect(names(dayOn(buildBoth(), "2026-09-12").roots)).toEqual([
      "Thanksgiving dinner",
      "Tacos",
    ]);
  });

  it("shares a bucket section across plans, in plan order", () => {
    const entries = buildBoth();

    expect(bucketSections(entries)).toHaveLength(1);
    const prep = bucketOn(entries, "wPrep");
    expect(prep).toMatchObject({ name: "Prep", bucketIds: ["hPrep", "wPrep"] });
    expect(names(prep.roots)).toEqual(["Brine turkey", "Stock"]);
  });

  it("gathers every plan's unplanned items together, in plan order", () => {
    expect(names(unplanned(buildBoth()).roots)).toEqual(["Tidy up", "Laundry"]);
  });
});

describe("the timeline's full order", () => {
  it("puts today's own extras, then unplanned, right before tomorrow", () => {
    const entries = build({
      buckets: [
        { id: "brunch", date: TODAY, name: "Brunch" },
        { id: "list", date: null, name: "Grocery list" },
      ],
    });

    const kinds = entries.map((e) =>
      e.kind === "day" ? `day:${e.date}` : e.kind,
    );
    const todayIndex = kinds.indexOf(`day:${TODAY}`);
    const tomorrow = `day:${"2026-09-10"}`;

    expect(kinds.slice(todayIndex, kinds.indexOf(tomorrow))).toEqual([
      `day:${TODAY}`,
      "bucket",
      "bucket",
      "unplanned",
    ]);
  });

  it("shows only one unplanned section, however many items lack a bucket", () => {
    const entries = build({
      rootIds: ["a", "b"],
      items: [item({ id: "a" }), item({ id: "b" })],
    });

    expect(entries.filter((e) => e.kind === "unplanned")).toHaveLength(1);
  });
});

describe("which dates appear", () => {
  it("shows today plus a week when the plan is empty", () => {
    const entries = build({});

    expect(days(entries).map((d) => d.date)).toEqual([
      "2026-09-09",
      "2026-09-10",
      "2026-09-11",
      "2026-09-12",
      "2026-09-13",
      "2026-09-14",
      "2026-09-15",
    ]);
    expect(gaps(entries)).toEqual([]);
    expect(unplanned(entries).roots).toEqual([]);
  });

  it("lays out the brief's worked example", () => {
    const entries = build({
      rootIds: ["pumpkin", "dinner"],
      items: [
        item({ id: "pumpkin", name: "Roast pumpkin", bucket: "bPast" }),
        item({ id: "dinner", name: "Thanksgiving dinner", bucket: "bFuture" }),
      ],
      buckets: [
        { id: "bPast", date: "2026-09-03", name: null },
        { id: "bFuture", date: "2026-09-25", name: null },
      ],
    });

    const dates = days(entries).map((d) => d.date);
    expect(dates[0]).toBe("2026-09-03");
    expect(dates.slice(1, 8)).toEqual([
      "2026-09-09",
      "2026-09-10",
      "2026-09-11",
      "2026-09-12",
      "2026-09-13",
      "2026-09-14",
      "2026-09-15",
    ]);
    expect(dates[8]).toBe("2026-09-19");
    expect(dates[dates.length - 1]).toBe("2026-10-01");
    expect(dates).toHaveLength(1 + 7 + 13);

    expect(gaps(entries)).toEqual([
      { kind: "gap", after: "2026-09-03", before: "2026-09-09", days: 5 },
      { kind: "gap", after: "2026-09-15", before: "2026-09-19", days: 3 },
    ]);
  });

  it("gives a past date no window of its own", () => {
    const entries = build({
      rootIds: ["pumpkin"],
      items: [item({ id: "pumpkin", name: "Roast pumpkin", bucket: "b1" })],
      buckets: [{ id: "b1", date: "2026-09-03", name: null }],
    });

    expect(days(entries).map((d) => d.date)).not.toContain("2026-09-04");
  });

  it("clamps a future item's window at today, leaving no past filler", () => {
    const entries = build({
      rootIds: ["dinner"],
      items: [
        item({ id: "dinner", name: "Thanksgiving dinner", bucket: "b1" }),
      ],
      buckets: [{ id: "b1", date: "2026-09-11", name: null }],
    });

    const dates = days(entries).map((d) => d.date);
    expect(dates[0]).toBe(TODAY);
    expect(dates[dates.length - 1]).toBe("2026-09-17");
    expect(gaps(entries)).toEqual([]);
  });

  it("merges adjacent spans without emitting an empty gap", () => {
    // today's span ends 09-15; this item's begins 09-16.
    const entries = build({
      rootIds: ["dinner"],
      items: [
        item({ id: "dinner", name: "Thanksgiving dinner", bucket: "b1" }),
      ],
      buckets: [{ id: "b1", date: "2026-09-22", name: null }],
    });

    const dates = days(entries).map((d) => d.date);
    expect(gaps(entries)).toEqual([]);
    expect(dates[0]).toBe(TODAY);
    expect(dates[dates.length - 1]).toBe("2026-09-28");
  });

  it("opens a span for a named, dated bucket outside today's window", () => {
    const entries = build({
      buckets: [{ id: "lunch", date: "2026-09-25", name: "Lunch" }],
    });

    expect(days(entries).map((d) => d.date)).toContain("2026-09-25");
  });
});

describe("buildSubtree", () => {
  const DINNER = [
    item({
      id: "dinner",
      name: "Thanksgiving dinner",
      children: ["pie", "turkey"],
    }),
    item({ id: "pie", name: "Pumpkin pie", children: ["crust"] }),
    item({ id: "crust", name: "Pie crust" }),
    item({ id: "turkey", name: "Roast turkey" }),
  ];

  it("keeps leaves the timeline would hide", () => {
    expect(names(buildSubtree(DINNER, "dinner"))).toEqual([
      "Pumpkin pie",
      "Roast turkey",
    ]);
  });

  it("nests to arbitrary depth", () => {
    const nodes = buildSubtree(DINNER, "dinner");

    expect(names(nodes[0].children)).toEqual(["Pie crust"]);
  });

  it("excludes the root itself", () => {
    expect(names(buildSubtree(DINNER, "dinner"))).not.toContain(
      "Thanksgiving dinner",
    );
  });

  it("gives a leaf no descendants", () => {
    expect(buildSubtree(DINNER, "turkey")).toEqual([]);
  });

  it("gives an unknown id no descendants", () => {
    expect(buildSubtree(DINNER, "nope")).toEqual([]);
  });
});

describe("sectionOfItems", () => {
  it("gives each shown item the section it shows in, however deep", () => {
    const entries = build({
      rootIds: ["dinner", "lunch", "shop"],
      items: [
        item({ id: "dinner", bucket: "sat", children: ["pie", "prep"] }),
        item({ id: "pie", bucket: "sat" }),
        item({ id: "prep", bucket: "fri" }),
        item({ id: "lunch", bucket: "lunchOut" }),
        item({ id: "shop" }),
      ],
      buckets: [
        { id: "sat", date: "2026-09-12", name: null },
        { id: "fri", date: "2026-09-11", name: null },
        { id: "lunchOut", date: "2026-09-12", name: "Lunch" },
      ],
    });

    expect(Object.fromEntries(sectionOfItems(entries))).toEqual({
      dinner: "2026-09-12",
      pie: "2026-09-12",
      prep: "2026-09-11",
      lunch: bucketSectionKey("Lunch", "2026-09-12"),
      shop: UNPLANNED_SECTION,
    });
  });
});
