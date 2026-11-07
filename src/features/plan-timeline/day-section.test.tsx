import { PlanItemStatus } from "@/__generated__/graphql";
import {
  buildPlanDirectory,
  PlanDirectoryProvider,
} from "@/features/plan-directory";
import {
  PlanItemFragment,
  PlanItemFragmentDoc,
} from "@/features/plan-item/__generated__/planItem.generated";
import {
  buildInMemoryCache,
  render,
  screen,
  seedFragment,
  userEvent,
  within,
} from "@/test";
import { describe, expect, it, vi } from "vitest";
import { DaySection } from "./day-section";
import { PlanItemNode, TimelineDay, TimelineItem } from "./model";

const PIE = { id: "42", name: "Pumpkin pie" };

const DIRECTORY = buildPlanDirectory([
  {
    id: "7",
    name: "Holidays",
    color: "#F57F17",
    mine: true,
    grants: [],
    descendants: [],
    buckets: [{ id: "b1" }],
  },
]);

function node({ id, name }: { id: string; name: string }): PlanItemNode {
  const item: TimelineItem = {
    __typename: "PlanItem",
    id,
    name,
    bucket: null,
    children: [],
  };
  return { item, children: [] };
}

function fragment({
  id,
  name,
}: {
  id: string;
  name: string;
}): PlanItemFragment {
  return {
    __typename: "PlanItem",
    id,
    name,
    status: PlanItemStatus.NEEDED,
    notes: null,
    preparation: null,
    parent: { __typename: "Plan", id: "7" },
    aggregate: null,
    ingredient: null,
    quantity: null,
    components: [],
    bucket: null,
  };
}

function day(roots: readonly PlanItemNode[]): TimelineDay {
  return { kind: "day", date: "2026-09-09", bucketIds: ["b1"], roots };
}

function renderDay(
  roots: readonly PlanItemNode[],
  isToday = false,
  onSelect?: (id: string) => void,
) {
  const cache = buildInMemoryCache();
  seedFragment(cache, PlanItemFragmentDoc, "planItem", fragment(PIE));
  return render(
    <PlanDirectoryProvider directory={DIRECTORY}>
      <ol>
        <DaySection
          day={day(roots)}
          isToday={isToday}
          context={new Map()}
          onSelect={onSelect}
        />
      </ol>
    </PlanDirectoryProvider>,
    { cache },
  );
}

describe("DaySection", () => {
  it("labels itself with the weekday and date", () => {
    renderDay([]);

    expect(screen.getByRole("heading", { name: /Sep 9/ })).toBeVisible();
  });

  it("labels a Wednesday as one", () => {
    renderDay([]);

    expect(screen.getByRole("heading")).toHaveTextContent(/Wed/);
  });

  it("marks itself as the current date only when it is today", () => {
    renderDay([], true);

    expect(screen.getByRole("listitem")).toHaveAttribute(
      "aria-current",
      "date",
    );
  });

  it("leaves aria-current off every other day", () => {
    renderDay([], false);

    expect(screen.getByRole("listitem")).not.toHaveAttribute("aria-current");
  });

  it("shows the items it holds", () => {
    renderDay([node(PIE)]);

    expect(screen.getByText("Pumpkin pie")).toBeVisible();
  });

  it("shows no item list when it holds nothing", () => {
    renderDay([]);

    const section = screen.getByRole("listitem");
    expect(within(section).queryByRole("list")).toBeNull();
  });

  it("passes a chosen item up", async () => {
    const onSelect = vi.fn();
    renderDay([node(PIE)], false, onSelect);

    await userEvent.click(screen.getByRole("button", { name: "Pumpkin pie" }));

    expect(onSelect).toHaveBeenCalledWith("42");
  });

  it("links to cooking everything it holds", () => {
    renderDay([node(PIE)]);

    expect(screen.getByRole("link", { name: /^Cook .*Sep 9/ })).toBeVisible();
  });

  it("offers nothing to cook when it holds nothing", () => {
    renderDay([]);

    expect(screen.queryByRole("link", { name: /^Cook / })).toBeNull();
  });
});
