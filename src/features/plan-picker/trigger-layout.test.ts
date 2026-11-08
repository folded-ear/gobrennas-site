import { describe, expect, it } from "vitest";
import { layoutTriggerSide, type TriggerSide } from "./trigger-layout";

type Plan = { id: string };

const PLANS = ["p1", "p2", "p3", "p4", "p5", "p6", "p7"].map((id) => ({ id }));

/** I lay out a side, naming each plan by its ID. */
function layout(plans: Plan[], selectedIds: string[], recentIds: string[]) {
  return ids(layoutTriggerSide(plans, selectedIds, recentIds));
}

function ids({ own, stacked }: TriggerSide<Plan>) {
  return {
    own: own.map(({ plan, ...rest }) => ({ id: plan.id, ...rest })),
    stacked: stacked.map((it) => it.id),
  };
}

/**
 * I replay toggles from P1 alone selected, as a user would make them, and
 * lay out the result.
 */
function replay(...toggles: string[]) {
  let selected = ["p1"];
  let recent: string[] = [];
  for (const id of toggles) {
    selected = selected.includes(id)
      ? selected.filter((it) => it !== id)
      : [...selected, id];
    recent = [id, ...recent.filter((it) => it !== id)];
  }
  return layout(PLANS, selected, recent);
}

describe("layoutTriggerSide", () => {
  it("shows each selected plan side by side before anything is toggled", () => {
    expect(layout(PLANS, ["p3", "p1"], [])).toEqual({
      own: [{ id: "p1" }, { id: "p3" }],
      stacked: [],
    });
  });

  it("stacks more than three selected plans before anything is toggled", () => {
    expect(layout(PLANS, ["p1", "p2", "p3", "p4"], [])).toEqual({
      own: [],
      stacked: ["p1", "p2", "p3", "p4"],
    });
  });

  it("keeps a plan unselected first as a ring beside the selection", () => {
    // enable P2, then disable P1
    expect(replay("p2", "p1")).toEqual({
      own: [{ id: "p1" }, { id: "p2" }],
      stacked: [],
    });
  });

  it("shows four selected plans in order, the latest among them", () => {
    expect(replay("p2", "p3", "p4")).toEqual({
      own: [{ id: "p1" }, { id: "p2" }, { id: "p3" }, { id: "p4" }],
      stacked: [],
    });
  });

  it("keeps the latest unselected plan in order beside three selected", () => {
    expect(replay("p2", "p3", "p4", "p4")).toEqual({
      own: [{ id: "p1" }, { id: "p2" }, { id: "p3" }, { id: "p4" }],
      stacked: [],
    });
  });

  it("fills out four avatars with recently unselected plans", () => {
    expect(replay("p2", "p3", "p4", "p2", "p3", "p4")).toEqual({
      own: [
        { id: "p1" },
        { id: "p2", fillSlot: 4 },
        { id: "p3", fillSlot: 3 },
        { id: "p4" },
      ],
      stacked: [],
    });
  });

  it("drops the oldest ring once four avatars show", () => {
    expect(replay("p2", "p3", "p4", "p5", "p2", "p3", "p4", "p5")).toEqual({
      own: [
        { id: "p1" },
        { id: "p3", fillSlot: 4 },
        { id: "p4", fillSlot: 3 },
        { id: "p5" },
      ],
      stacked: [],
    });
  });

  it("never drops a ring when a plan is unselected beside a short row", () => {
    const before = replay("p2", "p3", "p4", "p4");
    const after = replay("p2", "p3", "p4", "p4", "p3");
    const shown = (side: typeof before) => side.own.map((it) => it.id);
    expect(shown(before)).toHaveLength(4);
    expect(shown(after)).toEqual(expect.arrayContaining(shown(before)));
  });

  it("isolates the latest plan before the stack past three", () => {
    expect(replay("p2", "p3", "p4", "p5")).toEqual({
      own: [{ id: "p5" }],
      stacked: ["p1", "p2", "p3", "p4"],
    });
  });

  it("isolates the latest unselected plan before the stack", () => {
    expect(replay("p2", "p3", "p4", "p5", "p6", "p6")).toEqual({
      own: [{ id: "p6" }],
      stacked: ["p1", "p2", "p3", "p4", "p5"],
    });
  });

  it("ignores selected and recent plans from elsewhere", () => {
    expect(layout([{ id: "p1" }, { id: "p2" }], ["p1", "x9"], ["x8"])).toEqual({
      own: [{ id: "p1" }],
      stacked: [],
    });
  });
});
