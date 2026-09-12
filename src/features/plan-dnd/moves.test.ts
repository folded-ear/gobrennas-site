import { AccessLevel } from "@/__generated__/graphql";
import { describe, expect, it } from "vitest";
import {
  applyTreeMove,
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

function source(id: string, childIds: readonly string[] = []): TreeSource {
  return { id, children: childIds.map((c) => ({ id: c })) };
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
