import { PlanItemStatus } from "@/__generated__/graphql";
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
  return { kind: "day", date: "2026-09-09", roots };
}

function renderDay(
  roots: readonly PlanItemNode[],
  isToday = false,
  onSelect?: (id: string) => void,
) {
  const cache = buildInMemoryCache();
  seedFragment(cache, PlanItemFragmentDoc, "planItem", fragment(PIE));
  return render(
    <ol>
      <DaySection day={day(roots)} isToday={isToday} onSelect={onSelect} />
    </ol>,
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
});
