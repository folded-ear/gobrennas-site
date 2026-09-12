import { describe, expect, it } from "vitest";
import {
  ancestorsOf,
  buildPlanContext,
  BuildPlanContextInput,
  PlanContext,
} from "./context";
import { TimelineItem } from "./model";

const TODAY = "2026-09-09";
const WEDNESDAY = "2026-11-25";
const THURSDAY = "2026-11-26";
const FRIDAY = "2026-11-27";

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

function build(input: Partial<BuildPlanContextInput>): PlanContext {
  return buildPlanContext({
    rootIds: [],
    items: [],
    buckets: [],
    today: TODAY,
    ...input,
  });
}

/**
 * Thanksgiving > Dinner > Salad > Dressing > Oil, the whole plan on
 * Thursday except whichever bucket the dressing is put in.
 */
function thanksgiving(dressingBucket?: string): PlanContext {
  return build({
    rootIds: ["thanksgiving"],
    items: [
      item({
        id: "thanksgiving",
        name: "Thanksgiving",
        bucket: "thu",
        children: ["dinner"],
      }),
      item({ id: "dinner", name: "Dinner", children: ["salad"] }),
      item({ id: "salad", name: "Salad", children: ["dressing"] }),
      item({
        id: "dressing",
        name: "Dressing",
        bucket: dressingBucket,
        children: ["oil"],
      }),
      item({ id: "oil", name: "Oil" }),
    ],
    buckets: [
      { id: "thu", date: THURSDAY, name: null },
      { id: "wed", date: WEDNESDAY, name: null },
      { id: "fri", date: FRIDAY, name: null },
    ],
  });
}

function contextFor(context: PlanContext, id: string) {
  const found = context.get(id);
  if (!found) throw new Error(`No context for ${id}`);
  return found;
}

describe("an item's date", () => {
  it("dates an item by its own bucket", () => {
    expect(contextFor(thanksgiving(), "thanksgiving").date).toBe(THURSDAY);
  });

  it("inherits the nearest ancestor's date", () => {
    expect(contextFor(thanksgiving(), "salad").date).toBe(THURSDAY);
  });

  it("dates a leaf the timeline never shows", () => {
    // Oil is an unbucketed leaf, so the timeline hides it; the drawer
    // still shows it and still needs to know when it happens.
    expect(contextFor(thanksgiving("wed"), "oil").date).toBe(WEDNESDAY);
  });

  it("falls back to today when no ancestor is bucketed", () => {
    const context = build({
      rootIds: ["dinner"],
      items: [item({ id: "dinner", name: "Dinner" })],
    });

    expect(contextFor(context, "dinner").date).toBe(TODAY);
  });

  it("walks past a bucket carrying no date", () => {
    const context = build({
      rootIds: ["dinner"],
      items: [
        item({ id: "dinner", bucket: "dated", children: ["pie"] }),
        item({ id: "pie", bucket: "undated" }),
      ],
      buckets: [
        { id: "dated", date: THURSDAY, name: null },
        { id: "undated", date: null, name: null },
      ],
    });

    expect(contextFor(context, "pie").date).toBe(THURSDAY);
  });
});

describe("an item's own name", () => {
  it("carries its name, so its context describes it without help", () => {
    expect(contextFor(thanksgiving(), "dressing").name).toBe("Dressing");
  });
});

describe("an item's parent", () => {
  it("names the parent it sits under, and when that parent happens", () => {
    expect(contextFor(thanksgiving("wed"), "dressing").parent).toEqual({
      id: "salad",
      name: "Salad",
      date: THURSDAY,
    });
  });

  it("gives a plan's own child no parent", () => {
    expect(contextFor(thanksgiving(), "thanksgiving").parent).toBeNull();
  });
});

describe("separation from a parent", () => {
  it("reads an item on its parent's date as together with it", () => {
    expect(contextFor(thanksgiving(), "dressing").separation).toBeNull();
  });

  it("reads an item made ahead of its parent as early", () => {
    expect(contextFor(thanksgiving("wed"), "dressing").separation).toBe(
      "early",
    );
  });

  it("reads an item left until after its parent as late", () => {
    expect(contextFor(thanksgiving("fri"), "dressing").separation).toBe("late");
  });

  it("separates only the item moved, not what hangs below it", () => {
    // Oil follows the dressing to Wednesday, so it is where it belongs.
    expect(contextFor(thanksgiving("wed"), "oil").separation).toBeNull();
  });

  it("gives a plan's own child no separation", () => {
    expect(contextFor(thanksgiving(), "thanksgiving").separation).toBeNull();
  });
});

describe("the chain above an item", () => {
  it("names every ancestor, root first, with the date each sits on", () => {
    expect(ancestorsOf(thanksgiving("wed"), "dressing")).toEqual([
      { id: "thanksgiving", name: "Thanksgiving", date: THURSDAY },
      { id: "dinner", name: "Dinner", date: THURSDAY },
      { id: "salad", name: "Salad", date: THURSDAY },
    ]);
  });

  it("gives a plan's own child an empty chain", () => {
    expect(ancestorsOf(thanksgiving(), "thanksgiving")).toEqual([]);
  });
});
