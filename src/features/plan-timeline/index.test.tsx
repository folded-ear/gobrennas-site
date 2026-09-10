import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlanTimeline } from "./index";
import { TimelineEntry } from "./model";

const TODAY = "2026-09-09";

const ENTRIES: readonly TimelineEntry[] = [
  { kind: "day", date: "2026-09-03", roots: [] },
  { kind: "gap", after: "2026-09-03", before: "2026-09-09", days: 5 },
  { kind: "day", date: TODAY, roots: [] },
  { kind: "day", date: "2026-09-10", roots: [] },
];

describe("PlanTimeline", () => {
  it("lays days and gaps out in the order it was given", () => {
    render(<PlanTimeline entries={ENTRIES} today={TODAY} />);

    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(4);
    expect(rows[0]).toHaveTextContent(/Sep 3/);
    expect(rows[1]).toHaveTextContent("5 days");
    expect(rows[2]).toHaveTextContent(/Sep 9/);
    expect(rows[3]).toHaveTextContent(/Sep 10/);
  });

  it("marks exactly one day as today", () => {
    render(<PlanTimeline entries={ENTRIES} today={TODAY} />);

    const current = screen
      .getAllByRole("listitem")
      .filter((row) => row.getAttribute("aria-current") === "date");
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent(/Sep 9/);
  });

  it("renders an empty timeline as an empty list", () => {
    render(<PlanTimeline entries={[]} today={TODAY} />);

    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });
});
