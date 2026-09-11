import { describe, expect, it } from "vitest";
import {
  buildSubtree,
  buildTimeline,
  BuildTimelineInput,
  dayOfItems,
  PlanItemNode,
  TimelineDay,
  TimelineEntry,
  TimelineGap,
  TimelineItem,
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

function build(input: Partial<BuildTimelineInput>): readonly TimelineEntry[] {
  return buildTimeline({
    rootIds: [],
    items: [],
    buckets: [],
    today: TODAY,
    ...input,
  });
}

function days(entries: readonly TimelineEntry[]): readonly TimelineDay[] {
  return entries.filter((e): e is TimelineDay => e.kind === "day");
}

function gaps(entries: readonly TimelineEntry[]): readonly TimelineGap[] {
  return entries.filter((e): e is TimelineGap => e.kind === "gap");
}

function dayOn(entries: readonly TimelineEntry[], date: string): TimelineDay {
  const found = days(entries).find((d) => d.date === date);
  if (!found) throw new Error(`No day for ${date}`);
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

  it("falls back to today when no ancestor is bucketed", () => {
    const entries = build({
      rootIds: ["dinner"],
      items: [item({ id: "dinner", name: "Thanksgiving dinner" })],
    });

    expect(names(dayOn(entries, TODAY).roots)).toEqual(["Thanksgiving dinner"]);
  });
});

describe("what the timeline shows", () => {
  it("shows a top-level item with no bucket and no children", () => {
    const entries = build({
      rootIds: ["shop"],
      items: [item({ id: "shop", name: "Go shopping" })],
    });

    expect(names(dayOn(entries, TODAY).roots)).toEqual(["Go shopping"]);
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

    const dinner = dayOn(entries, TODAY).roots[0];
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

    const dinner = dayOn(entries, TODAY).roots[0];
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

    const dinner = dayOn(entries, TODAY).roots[0];
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

    const dinner = dayOn(entries, TODAY).roots[0];
    expect(names(dinner.children)).toEqual([
      "Pumpkin pie",
      "Roast turkey",
      "Gravy",
    ]);
  });

  it("orders day roots by the plan's own child order", () => {
    const entries = build({
      rootIds: ["dinner", "brunch"],
      items: [
        item({ id: "brunch", name: "Sunday brunch" }),
        item({ id: "dinner", name: "Thanksgiving dinner" }),
      ],
    });

    expect(names(dayOn(entries, TODAY).roots)).toEqual([
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

    const dinner = dayOn(entries, TODAY).roots[0];
    expect(names(dinner.children)).toEqual(["Pumpkin pie"]);
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

describe("dayOfItems", () => {
  it("gives each shown item the day it shows on, however deep", () => {
    const entries = build({
      rootIds: ["dinner", "lunch"],
      items: [
        item({ id: "dinner", bucket: "sat", children: ["pie", "prep"] }),
        item({ id: "pie", bucket: "sat" }),
        item({ id: "prep", bucket: "fri" }),
        item({ id: "lunch" }),
      ],
      buckets: [
        { id: "sat", date: "2026-09-12", name: null },
        { id: "fri", date: "2026-09-11", name: null },
      ],
    });

    expect(Object.fromEntries(dayOfItems(entries))).toEqual({
      dinner: "2026-09-12",
      pie: "2026-09-12",
      prep: "2026-09-11",
      lunch: TODAY,
    });
  });
});
