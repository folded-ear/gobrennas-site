import { PlanItemStatus } from "@/__generated__/graphql";
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

    expect(screen.getByRole("button", { name: "Roast pumpkin" })).toBeVisible();

    // Sep 4-8 are empty past days, so they collapse into one break.
    expect(document.body).toHaveTextContent(
      /Sep 3[\s\S]*Roast pumpkin[\s\S]*5 days[\s\S]*Sep 9/,
    );
  });
});
