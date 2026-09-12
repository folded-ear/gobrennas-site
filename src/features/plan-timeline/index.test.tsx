import { PlanItemStatus } from "@/__generated__/graphql";
import { PlanDnd } from "@/features/plan-dnd";
import {
  keyboardCancel,
  keyboardDrag,
  keyboardDrop,
} from "@/features/plan-dnd/keyboard-drag";
import { buildPlanTree } from "@/features/plan-dnd/moves";
import { PlanMoves } from "@/features/plan-dnd/use-plan-moves";
import { PlanItemFragmentDoc } from "@/features/plan-item/__generated__/planItem.generated";
import { buildInMemoryCache, render, screen, seedFragment } from "@/test";
import { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlanTimeline } from "./index";
import { TimelineItem } from "./model";

const PUMPKIN: TimelineItem = {
  __typename: "PlanItem",
  id: "1",
  name: "Roast pumpkin",
  bucket: { __typename: "PlanBucket", id: "b1" },
  children: [],
};

function renderTimeline(ui: ReactElement) {
  const cache = buildInMemoryCache();
  seedFragment(cache, PlanItemFragmentDoc, "planItem", {
    __typename: "PlanItem",
    id: PUMPKIN.id,
    name: PUMPKIN.name,
    status: PlanItemStatus.NEEDED,
    notes: null,
    preparation: null,
    parent: { __typename: "Plan", id: "7" },
    aggregate: null,
    ingredient: null,
    quantity: null,
    components: [],
    bucket: null,
  });
  return render(ui, { cache });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 8, 9, 9, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("PlanTimeline", () => {
  it("anchors an empty plan at today and runs on a week", () => {
    render(<PlanTimeline rootIds={[]} items={[]} buckets={[]} />);

    const days = screen.getAllByRole("listitem");
    expect(days).toHaveLength(7);
    expect(days[0]).toHaveTextContent(/Sep 9/);
    expect(days[0]).toHaveAttribute("aria-current", "date");
    expect(days[6]).toHaveTextContent(/Sep 15/);
  });

  it("puts a past item on its own date, with a break before today", () => {
    renderTimeline(
      <PlanTimeline
        rootIds={["1"]}
        items={[PUMPKIN]}
        buckets={[{ id: "b1", date: "2026-09-03", name: null }]}
      />,
    );

    expect(screen.getByText("Roast pumpkin")).toBeVisible();

    // Sep 4-8 are empty past days, so they collapse into one break.
    expect(document.body).toHaveTextContent(
      /Sep 3[\s\S]*Roast pumpkin[\s\S]*5 days[\s\S]*Sep 9/,
    );
  });
});

// Plan 7, with today Wednesday Sep 9:
//   Thanksgiving dinner (1), Sat Sep 12
//     Pumpkin pie (2), Sat Sep 12, so shown beneath dinner
//   Breakfast (6), Sat Sep 12
//   Leftovers lunch (8), no date, so today
const SEP_12 = { id: "bSep12", date: "2026-09-12", name: null };

function timelineItem(
  id: string,
  name: string,
  bucketId: string | null,
  childIds: readonly string[] = [],
): TimelineItem {
  return {
    __typename: "PlanItem",
    id,
    name,
    bucket: bucketId ? { __typename: "PlanBucket", id: bucketId } : null,
    children: childIds.map((c) => ({ __typename: "PlanItem", id: c })),
  };
}

const THANKSGIVING = [
  timelineItem("1", "Thanksgiving dinner", SEP_12.id, ["2"]),
  timelineItem("2", "Pumpkin pie", SEP_12.id),
  timelineItem("6", "Breakfast", SEP_12.id),
  timelineItem("8", "Leftovers lunch", null),
];
const ROOT_IDS = ["1", "6", "8"];

function fakeMoves(): PlanMoves {
  return { moveInTree: vi.fn(), moveToDate: vi.fn(), isMoving: () => false };
}

function renderMovable(dnd: Partial<PlanDnd> = {}) {
  const cache = buildInMemoryCache();
  for (const it of THANKSGIVING) {
    seedFragment(cache, PlanItemFragmentDoc, "planItem", {
      __typename: "PlanItem",
      id: it.id,
      name: it.name,
      status: PlanItemStatus.NEEDED,
      notes: null,
      preparation: null,
      parent: { __typename: "Plan", id: "7" },
      aggregate: null,
      ingredient: null,
      quantity: null,
      components: [],
      bucket: null,
    });
  }
  const tree = buildPlanTree(
    { id: "7", children: ROOT_IDS.map((id) => ({ id })) },
    THANKSGIVING,
  );
  return render(
    <PlanTimeline
      rootIds={ROOT_IDS}
      items={THANKSGIVING}
      buckets={[SEP_12]}
      dnd={{ tree, canMove: true, moves: fakeMoves(), ...dnd }}
    />,
    { cache },
  );
}

describe("PlanTimeline, moving items", () => {
  beforeEach(() => {
    // Only the date: a keyboard drag runs on real timers and frames.
    vi.useRealTimers();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 8, 9, 9, 0));
  });

  it("offers a handle on every item, nested or not", () => {
    renderMovable();

    expect(
      screen.getByRole("button", { name: "Move Thanksgiving dinner" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Move Pumpkin pie" }),
    ).toBeVisible();
  });

  it("offers no handles when the plan can't be changed", () => {
    renderMovable({ canMove: false });

    expect(screen.getByText("Breakfast")).toBeVisible();
    expect(screen.queryByRole("button", { name: /^Move / })).toBeNull();
  });

  it("offers a top-level item other days, and new places on its own", async () => {
    renderMovable();

    await keyboardDrag("Move Breakfast");

    expect(
      screen.getByRole("button", { name: /^Move to .*Sep 9/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^Move to .*Sep 12/ }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "Put before Thanksgiving dinner" }),
    ).toBeInTheDocument();
    // Breakfast already comes right after dinner.
    expect(
      screen.queryByRole("button", { name: "Put after Thanksgiving dinner" }),
    ).toBeNull();
    // Nested items can't be reordered around on the timeline.
    expect(
      screen.queryByRole("button", { name: /^Put \w+ Pumpkin pie$/ }),
    ).toBeNull();

    await keyboardCancel();
  });

  it("offers a nested item other days, but no new place on its own", async () => {
    renderMovable();

    await keyboardDrag("Move Pumpkin pie");

    expect(
      screen.getByRole("button", { name: /^Move to .*Sep 9/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Put / })).toBeNull();

    await keyboardCancel();
  });

  it("reorders a top-level item among the others on its day", async () => {
    const moves = fakeMoves();
    renderMovable({ moves });

    await keyboardDrag("Move Breakfast");
    await keyboardDrop("Put before Thanksgiving dinner");

    expect(moves.moveInTree).toHaveBeenCalledWith(
      { ids: ["6"], parentId: "7", afterId: null },
      "Breakfast",
    );
    expect(moves.moveToDate).not.toHaveBeenCalled();
  });

  it("moves any item to the day it's dropped on", async () => {
    const moves = fakeMoves();
    renderMovable({ moves });

    await keyboardDrag("Move Pumpkin pie");
    const today = screen.getByRole("button", { name: /^Move to .*Sep 9/ });
    await keyboardDrop(today.getAttribute("aria-label")!);

    expect(moves.moveToDate).toHaveBeenCalledWith(
      "2",
      "2026-09-09",
      "Pumpkin pie",
    );
    expect(moves.moveInTree).not.toHaveBeenCalled();
  });
});
