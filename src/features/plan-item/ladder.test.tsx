import {
  buildPlanContext,
  PlanContext,
} from "@/features/plan-timeline/context";
import { TimelineItem } from "@/features/plan-timeline/model";
import { render, screen, userEvent } from "@/test";
import { describe, expect, it, vi } from "vitest";
import { Ladder, ladderLines } from "./ladder";

const TODAY = "2026-09-09";
const WEDNESDAY = "2026-11-25";
const THURSDAY = "2026-11-26";
const FRIDAY = "2026-11-27";

type ItemSpec = {
  readonly id: string;
  readonly name: string;
  readonly bucket?: string;
  readonly children?: readonly string[];
};

function item({ id, name, bucket, children = [] }: ItemSpec): TimelineItem {
  return {
    __typename: "PlanItem",
    id,
    name,
    bucket: bucket ? { __typename: "PlanBucket", id: bucket } : null,
    children: children.map((childId) => ({
      __typename: "PlanItem",
      id: childId,
    })),
  };
}

/** Thanksgiving > Dinner > Salad > Dressing, all Thursday but the dressing. */
function thanksgiving(dressingBucket?: string): PlanContext {
  return buildPlanContext({
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
      item({ id: "dressing", name: "Dressing", bucket: dressingBucket }),
    ],
    buckets: [
      { id: "thu", date: THURSDAY, name: null },
      { id: "wed", date: WEDNESDAY, name: null },
      { id: "fri", date: FRIDAY, name: null },
    ],
    today: TODAY,
  });
}

describe("ladderLines", () => {
  it("walks from the plan's root down to the open item", () => {
    const lines = ladderLines(thanksgiving("wed"), "dressing");

    expect(lines.map((l) => l.name)).toEqual([
      "Thanksgiving",
      "Dinner",
      "Salad",
      "Dressing",
    ]);
    expect(lines.map((l) => l.depth)).toEqual([0, 1, 2, 3]);
  });

  it("says the date at the root, which nothing above it implies", () => {
    const lines = ladderLines(thanksgiving("wed"), "dressing");

    expect(lines[0]).toMatchObject({ name: "Thanksgiving", chip: true });
  });

  it("says the date again wherever it changes", () => {
    const lines = ladderLines(thanksgiving("wed"), "dressing");

    expect(lines[3]).toMatchObject({
      name: "Dressing",
      chip: true,
      date: WEDNESDAY,
      separation: "early",
    });
  });

  it("leaves a line bare when it inherits the date above it", () => {
    const lines = ladderLines(thanksgiving("wed"), "dressing");

    expect(lines.filter((l) => l.chip).map((l) => l.name)).toEqual([
      "Thanksgiving",
      "Dressing",
    ]);
  });

  it("says the date once when nothing below the root has moved", () => {
    const lines = ladderLines(thanksgiving(), "dinner");

    expect(lines.filter((l) => l.chip).map((l) => l.name)).toEqual([
      "Thanksgiving",
    ]);
  });

  it("gives an item it knows nothing about no walk at all", () => {
    expect(ladderLines(thanksgiving(), "gravy")).toEqual([]);
  });
});

describe("Ladder", () => {
  it("shows every step from the root down to the open item", () => {
    render(<Ladder context={thanksgiving("wed")} id="dressing" />);

    expect(screen.getByText("Thanksgiving")).toBeVisible();
    expect(screen.getByText("Dinner")).toBeVisible();
    expect(screen.getByText("Salad")).toBeVisible();
  });

  it("heads the drawer with the open item", () => {
    render(<Ladder context={thanksgiving("wed")} id="dressing" />);

    expect(screen.getByRole("heading", { name: "Dressing" })).toBeVisible();
  });

  it("shows where a moved item sits, and where its ancestry stayed", () => {
    render(<Ladder context={thanksgiving("wed")} id="dressing" />);

    expect(screen.getByText("Wed, Nov 25")).toBeVisible();
    expect(screen.getByText("Thu, Nov 26")).toBeVisible();
  });

  it("opens an ancestor that is chosen", async () => {
    const onSelect = vi.fn();
    render(
      <Ladder context={thanksgiving("wed")} id="dressing" onSelect={onSelect} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Dinner" }));

    expect(onSelect).toHaveBeenCalledWith("dinner");
  });

  it("leaves the open item itself inert", () => {
    const onSelect = vi.fn();
    render(
      <Ladder context={thanksgiving("wed")} id="dressing" onSelect={onSelect} />,
    );

    expect(screen.queryByRole("button", { name: "Dressing" })).toBeNull();
  });

  it("offers nothing to click when items cannot be opened", () => {
    render(<Ladder context={thanksgiving("wed")} id="dressing" />);

    expect(screen.getByText("Dinner")).toBeVisible();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
