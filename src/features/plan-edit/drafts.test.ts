import { buildPlanTree } from "@/features/plan-dnd/moves";
import { PlanItemNode, TimelineItem } from "@/features/plan-timeline/model";
import { describe, expect, it } from "vitest";
import {
  Beside,
  buildEntries,
  Draft,
  dropDraft,
  settleDraft,
  siblingBefore,
  treeOrder,
} from "./drafts";

const OPEN = "0";

function node(
  id: string,
  children: readonly PlanItemNode[] = [],
): PlanItemNode {
  const item: TimelineItem = {
    __typename: "PlanItem",
    id,
    name: `Item ${id}`,
    bucket: null,
    children: children.map((it) => ({
      __typename: "PlanItem",
      id: it.item.id,
    })),
  };
  return { item, children };
}

/** The open item's rows: pie (1) over crust (2) and filling (3), cream (4). */
const NODES = [node("1", [node("2"), node("3")]), node("4")];

const TREE = buildPlanTree([
  { id: OPEN, children: [{ id: "1" }, { id: "4" }] },
  { id: "1", children: [{ id: "2" }, { id: "3" }] },
  { id: "2", children: [] },
  { id: "3", children: [] },
  { id: "4", children: [] },
]);

function draft(
  draftId: string,
  beside: Beside,
  { parentId = "1", afterId = null as Draft["afterId"] } = {},
): Draft {
  return {
    draftId,
    planId: "7",
    parentId,
    afterId,
    beside,
    text: "",
    state: "editing",
  };
}

function after(key: Draft["afterId"] & object): Beside {
  return { key, side: "after" };
}

/** I give the order a tree of entries shows, as short labels. */
function shown(drafts: readonly Draft[]) {
  return treeOrder(buildEntries(NODES, drafts, OPEN)).map((it) =>
    "id" in it ? it.id : it.draftId,
  );
}

describe("buildEntries", () => {
  it("shows items as they are when there are no drafts", () => {
    expect(shown([])).toEqual(["1", "2", "3", "4"]);
  });

  it("shows a draft below the row it came from, and that row's own rows", () => {
    expect(
      shown([draft("d1", after({ id: "1" }), { parentId: OPEN })]),
    ).toEqual(["1", "2", "3", "d1", "4"]);
  });

  it("shows a draft above the row it came from", () => {
    expect(shown([draft("d1", { key: { id: "3" }, side: "before" })])).toEqual([
      "1",
      "2",
      "d1",
      "3",
      "4",
    ]);
  });

  it("shows the newest of two drafts nearest the row both came from", () => {
    expect(
      shown([draft("d1", after({ id: "2" })), draft("d2", after({ id: "2" }))]),
    ).toEqual(["1", "2", "d2", "d1", "3", "4"]);
  });

  it("shows a draft made from a draft below it", () => {
    expect(
      shown([
        draft("d1", after({ id: "2" })),
        draft("d2", after({ draftId: "d1" })),
      ]),
    ).toEqual(["1", "2", "d1", "d2", "3", "4"]);
  });

  it("shows a first child first in its parent's rows", () => {
    expect(shown([draft("d1", { firstIn: OPEN }, { parentId: OPEN })])).toEqual(
      ["d1", "1", "2", "3", "4"],
    );
    expect(shown([draft("d1", { firstIn: "1" })])).toEqual([
      "1",
      "d1",
      "2",
      "3",
      "4",
    ]);
  });

  it("shows a draft whose row has gone at the end", () => {
    expect(shown([draft("d1", after({ id: "9" }))])).toEqual([
      "1",
      "2",
      "3",
      "4",
      "d1",
    ]);
  });
});

describe("treeOrder", () => {
  it("puts a heading before every row", () => {
    expect(treeOrder(buildEntries(NODES, [], OPEN), { id: OPEN })).toEqual([
      { id: OPEN },
      { id: "1" },
      { id: "2" },
      { id: "3" },
      { id: "4" },
    ]);
  });
});

describe("siblingBefore", () => {
  it("gives the sibling before an item", () => {
    expect(siblingBefore(TREE, [], "1", { id: "3" })).toEqual({ id: "2" });
  });

  it("gives nothing before a first child", () => {
    expect(siblingBefore(TREE, [], "1", { id: "2" })).toBeNull();
  });

  it("counts drafts among the siblings, where they'll be created", () => {
    const drafts = [
      draft("d1", after({ id: "2" }), { afterId: { id: "2" } }),
      draft("d2", { firstIn: "1" }),
      draft("d3", { firstIn: "1" }),
    ];

    expect(siblingBefore(TREE, drafts, "1", { id: "3" })).toEqual({
      draftId: "d1",
    });
    expect(siblingBefore(TREE, drafts, "1", { draftId: "d2" })).toEqual({
      draftId: "d3",
    });
  });
});

describe("dropDraft", () => {
  it("hands a thrown-away draft's place to drafts placed after it", () => {
    const drafts = [
      draft("d1", after({ id: "2" }), { afterId: { id: "2" } }),
      draft("d2", after({ draftId: "d1" }), { afterId: { draftId: "d1" } }),
    ];

    expect(dropDraft(drafts, "d1")).toEqual([
      draft("d2", after({ id: "2" }), { afterId: { id: "2" } }),
    ]);
  });
});

describe("dropDraft, before a row", () => {
  it("keeps a draft shown after a thrown-away one where it showed", () => {
    const drafts = [
      draft("d1", { key: { id: "3" }, side: "before" }),
      draft("d2", after({ draftId: "d1" })),
    ];

    expect(dropDraft(drafts, "d1")).toEqual([
      draft("d2", { key: { id: "3" }, side: "before" }),
    ]);
  });
});

describe("settleDraft", () => {
  const drafts = [
    draft("d1", after({ id: "2" }), { afterId: { id: "2" } }),
    draft("d2", after({ draftId: "d1" }), { afterId: { draftId: "d1" } }),
  ];

  it("points drafts at a created item that stays where its draft was", () => {
    expect(settleDraft(drafts, "d1", "100", true)).toEqual([
      draft("d2", after({ id: "100" }), { afterId: { id: "100" } }),
    ]);
  });

  it("keeps drafts where they show when a created item moves away", () => {
    expect(settleDraft(drafts, "d1", "100", false)).toEqual([
      draft("d2", after({ id: "2" }), { afterId: { id: "100" } }),
    ]);
  });
});
