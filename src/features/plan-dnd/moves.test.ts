import { AccessLevel } from "@/__generated__/graphql";
import { describe, expect, it } from "vitest";
import {
  applyTreeMove,
  bucketChangeFor,
  bucketForDate,
  buildPlanTree,
  canChangePlan,
  PlanTree,
  treeMove,
  TreeSource,
  TreeZone,
} from "./moves";

// Plan 7:
//   Thanksgiving dinner (1)
//     Pumpkin pie (2)
//       Pie crust (3)
//         Butter (4)
//     Roast turkey (5)
//   Breakfast (6)
//   Leftovers lunch (8)
const PLAN_ID = "7";
const DINNER = "1";
const PIE = "2";
const CRUST = "3";
const BUTTER = "4";
const TURKEY = "5";
const BREAKFAST = "6";
const LUNCH = "8";

function source(
  id: string,
  childIds: readonly string[] = [],
  bucketId: string | null = null,
): TreeSource {
  return {
    id,
    children: childIds.map((c) => ({ id: c })),
    bucket: bucketId ? { id: bucketId } : null,
  };
}

function thanksgiving(): PlanTree {
  return buildPlanTree(source(PLAN_ID, [DINNER, BREAKFAST, LUNCH]), [
    source(DINNER, [PIE, TURKEY]),
    source(PIE, [CRUST]),
    source(CRUST, [BUTTER]),
    source(BUTTER),
    source(TURKEY),
    source(BREAKFAST),
    source(LUNCH),
  ]);
}

describe("buildPlanTree", () => {
  it("lists each parent's children in order, the plan's included", () => {
    const tree = thanksgiving();

    expect(tree.childrenOf.get(PLAN_ID)).toEqual([DINNER, BREAKFAST, LUNCH]);
    expect(tree.childrenOf.get(DINNER)).toEqual([PIE, TURKEY]);
  });

  it("knows each item's parent, however deep", () => {
    const tree = thanksgiving();

    expect(tree.parentOf.get(DINNER)).toBe(PLAN_ID);
    expect(tree.parentOf.get(BUTTER)).toBe(CRUST);
  });

  it("knows each item's own bucket, or nothing when it has none", () => {
    const tree = buildPlanTree(source(PLAN_ID, [DINNER]), [
      source(DINNER, [], "bDinner"),
    ]);

    expect(tree.bucketOf.get(DINNER)).toBe("bDinner");
    expect(tree.bucketOf.get(PLAN_ID)).toBeNull();
  });
});

describe("treeMove", () => {
  it("nests an item as the first child of the item it lands on", () => {
    expect(treeMove(thanksgiving(), TURKEY, CRUST, "child")).toEqual({
      ids: [TURKEY],
      parentId: CRUST,
      afterId: null,
    });
  });

  it("nests under an item that has no children yet", () => {
    expect(treeMove(thanksgiving(), BREAKFAST, TURKEY, "child")).toEqual({
      ids: [BREAKFAST],
      parentId: TURKEY,
      afterId: null,
    });
  });

  it("puts an item before the first of its new siblings", () => {
    expect(treeMove(thanksgiving(), TURKEY, PIE, "before")).toEqual({
      ids: [TURKEY],
      parentId: DINNER,
      afterId: null,
    });
  });

  it("puts an item before a later sibling, moving it up a level", () => {
    expect(treeMove(thanksgiving(), PIE, BREAKFAST, "before")).toEqual({
      ids: [PIE],
      parentId: PLAN_ID,
      afterId: DINNER,
    });
  });

  it("skips the dragged item itself when finding what precedes a target", () => {
    expect(treeMove(thanksgiving(), DINNER, LUNCH, "before")).toEqual({
      ids: [DINNER],
      parentId: PLAN_ID,
      afterId: BREAKFAST,
    });
  });

  it("puts an item after the item it lands on", () => {
    expect(treeMove(thanksgiving(), PIE, TURKEY, "after")).toEqual({
      ids: [PIE],
      parentId: DINNER,
      afterId: TURKEY,
    });
  });

  it("puts an item after a deeper item, moving it down levels", () => {
    expect(treeMove(thanksgiving(), LUNCH, BUTTER, "after")).toEqual({
      ids: [LUNCH],
      parentId: CRUST,
      afterId: BUTTER,
    });
  });

  it("reorders top-level items across the whole plan", () => {
    expect(treeMove(thanksgiving(), LUNCH, DINNER, "before")).toEqual({
      ids: [LUNCH],
      parentId: PLAN_ID,
      afterId: null,
    });
  });

  it.each<TreeZone>(["child", "before", "after"])(
    "won't move an item onto itself (%s)",
    (zone) => {
      expect(treeMove(thanksgiving(), PIE, PIE, zone)).toBeNull();
    },
  );

  it.each<[string, TreeZone]>([
    [CRUST, "child"],
    [BUTTER, "child"],
    [CRUST, "before"],
    [BUTTER, "after"],
  ])("won't move an item into its own subtree (%s, %s)", (target, zone) => {
    expect(treeMove(thanksgiving(), PIE, target, zone)).toBeNull();
  });

  it.each<[string, string, string, TreeZone]>([
    ["first child of its own parent", PIE, DINNER, "child"],
    ["before the sibling it already precedes", DINNER, BREAKFAST, "before"],
    ["after the sibling it already follows", BREAKFAST, DINNER, "after"],
  ])("gives nothing for a move that changes nothing: %s", (_, d, t, zone) => {
    expect(treeMove(thanksgiving(), d, t, zone)).toBeNull();
  });

  it("gives nothing for a target it doesn't know", () => {
    expect(treeMove(thanksgiving(), PIE, "404", "after")).toBeNull();
  });
});

describe("applyTreeMove", () => {
  it("takes the item from its old parent and gives it to the new one", () => {
    const moved = applyTreeMove(thanksgiving(), {
      ids: [TURKEY],
      parentId: CRUST,
      afterId: null,
    });

    expect(moved.childrenOf.get(DINNER)).toEqual([PIE]);
    expect(moved.childrenOf.get(CRUST)).toEqual([TURKEY, BUTTER]);
    expect(moved.parentOf.get(TURKEY)).toBe(CRUST);
  });

  it("places the item right after the named sibling", () => {
    const moved = applyTreeMove(thanksgiving(), {
      ids: [LUNCH],
      parentId: PLAN_ID,
      afterId: DINNER,
    });

    expect(moved.childrenOf.get(PLAN_ID)).toEqual([DINNER, LUNCH, BREAKFAST]);
  });

  it("gives a first child to an item that had none", () => {
    const moved = applyTreeMove(thanksgiving(), {
      ids: [BREAKFAST],
      parentId: TURKEY,
      afterId: null,
    });

    expect(moved.childrenOf.get(TURKEY)).toEqual([BREAKFAST]);
    expect(moved.childrenOf.get(PLAN_ID)).toEqual([DINNER, LUNCH]);
  });

  it("leaves the tree it was given alone", () => {
    const tree = thanksgiving();

    applyTreeMove(tree, { ids: [TURKEY], parentId: CRUST, afterId: null });

    expect(tree.childrenOf.get(DINNER)).toEqual([PIE, TURKEY]);
    expect(tree.parentOf.get(TURKEY)).toBe(DINNER);
  });
});

describe("bucketForDate", () => {
  const SAT = "2026-09-12";

  it("prefers an unnamed bucket on the date", () => {
    expect(
      bucketForDate(
        [
          { id: "b1", date: SAT, name: "Party prep" },
          { id: "b2", date: SAT, name: null },
          { id: "b3", date: SAT, name: null },
        ],
        SAT,
      ),
    ).toBe("b2");
  });

  it.each(["", "  "])("counts a bucket named %j as unnamed", (name) => {
    expect(
      bucketForDate(
        [
          { id: "b1", date: SAT, name: "Party prep" },
          { id: "b2", date: SAT, name },
        ],
        SAT,
      ),
    ).toBe("b2");
  });

  it("falls back to the first named bucket on the date", () => {
    expect(
      bucketForDate(
        [
          { id: "b1", date: "2026-09-13", name: null },
          { id: "b2", date: SAT, name: "Party prep" },
          { id: "b3", date: SAT, name: "Party" },
        ],
        SAT,
      ),
    ).toBe("b2");
  });

  it("gives nothing when no bucket carries the date", () => {
    expect(
      bucketForDate(
        [
          { id: "b1", date: null, name: null },
          { id: "b2", date: "2026-09-13", name: null },
        ],
        SAT,
      ),
    ).toBeNull();
  });
});

// Plan 7:
//   Dinner (1), bDinner
//     Dessert (2)
//       Garnish (3)
//     Sides (4), bSide
//       Gravy (5)
//   Breakfast (6)
function bucketed(overrides: Readonly<Record<string, string | null>> = {}) {
  const bucket = (id: string, fallback: string | null) =>
    overrides[id] !== undefined ? overrides[id] : fallback;
  return buildPlanTree(source(PLAN_ID, [DINNER, BREAKFAST]), [
    source(DINNER, [PIE, "sides"], bucket(DINNER, "bDinner")),
    source(PIE, [CRUST], bucket(PIE, null)),
    source(CRUST, [], bucket(CRUST, null)),
    source("sides", [TURKEY], bucket("sides", "bSide")),
    source(TURKEY, [], bucket(TURKEY, null)),
    source(BREAKFAST, [], bucket(BREAKFAST, null)),
  ]);
}

describe("bucketChangeFor", () => {
  it("gives the item its new bucket when nothing above already carries it", () => {
    expect(bucketChangeFor(bucketed(), BREAKFAST, "bNew")).toEqual({
      ownBucketId: "bNew",
      redundant: [],
    });
  });

  it("clears the item's bucket when an ancestor already carries the one it's given", () => {
    // Crust's nearest bucketed ancestor, through Pie, is Dinner (bDinner).
    expect(bucketChangeFor(bucketed(), CRUST, "bDinner")).toEqual({
      ownBucketId: null,
      redundant: [],
    });
  });

  it("stops at the first bucketed ancestor, not just any that shares the bucket", () => {
    // Turkey's nearest bucketed ancestor is Sides (bSide), not Dinner
    // (bDinner) beyond it, so joining bDinner is still a real change.
    expect(bucketChangeFor(bucketed(), TURKEY, "bDinner")).toEqual({
      ownBucketId: "bDinner",
      redundant: [],
    });
  });

  it("clears a descendant whose own bucket duplicates what it would inherit", () => {
    expect(
      bucketChangeFor(bucketed({ [CRUST]: "bDinner" }), DINNER, "bDinner"),
    ).toEqual({
      ownBucketId: "bDinner",
      redundant: [CRUST],
    });
  });

  it("leaves a descendant with a different bucket alone, and its own descendants too", () => {
    // Sides (bSide) is a wall: Gravy/Turkey beneath it inherits from Sides,
    // not from Dinner, so neither is touched even if Turkey shared bDinner.
    const tree = bucketed({ [TURKEY]: "bDinner" });

    expect(bucketChangeFor(tree, DINNER, "bDinner").redundant).toEqual([]);
  });

  it("combines both: clears the dropped item and a matching descendant", () => {
    // Pie has no bucket of its own; dropping it on Dinner's bucket makes
    // that explicit, but Crust already duplicates it beneath Pie.
    expect(
      bucketChangeFor(bucketed({ [CRUST]: "bDinner" }), PIE, "bDinner"),
    ).toEqual({
      ownBucketId: null,
      redundant: [CRUST],
    });
  });

  it("gives nothing to clear when unplanning with no bucket to inherit", () => {
    // Breakfast has no ancestor bucket, so nothing it inherits could make
    // Fake's own bucket redundant, whatever Fake's bucket is.
    const tree = buildPlanTree(source(PLAN_ID, [BREAKFAST]), [
      source(BREAKFAST, ["fake"], null),
      source("fake", [], "bSomething"),
    ]);

    expect(bucketChangeFor(tree, BREAKFAST, null)).toEqual({
      ownBucketId: null,
      redundant: [],
    });
  });

  it("still clears a matching descendant when unplanning inherits a bucket", () => {
    // Pie inherits bDinner once cleared, so Crust's explicit bDinner (with
    // nothing bucketed between Pie and Crust) is still redundant.
    expect(
      bucketChangeFor(bucketed({ [CRUST]: "bDinner" }), PIE, null),
    ).toEqual({
      ownBucketId: null,
      redundant: [CRUST],
    });
  });
});

describe("canChangePlan", () => {
  it("lets the owner change their plan", () => {
    expect(canChangePlan({ mine: true, grants: [] })).toBe(true);
  });

  it.each([AccessLevel.CHANGE, AccessLevel.ADMINISTER])(
    "lets a user granted %s change the plan",
    (level) => {
      expect(
        canChangePlan({ mine: false, grants: [{ level, user: { me: true } }] }),
      ).toBe(true);
    },
  );

  it("won't let a user granted only VIEW change the plan", () => {
    expect(
      canChangePlan({
        mine: false,
        grants: [{ level: AccessLevel.VIEW, user: { me: true } }],
      }),
    ).toBe(false);
  });

  it("ignores grants made to someone else", () => {
    expect(
      canChangePlan({
        mine: false,
        grants: [{ level: AccessLevel.CHANGE, user: { me: false } }],
      }),
    ).toBe(false);
  });
});
