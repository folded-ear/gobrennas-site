import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GapRow } from "./gap-row";
import { TimelineGap } from "./model";

function gap(days: number): TimelineGap {
  return {
    kind: "gap",
    after: "2026-09-15",
    before: "2026-09-19",
    days,
  };
}

function renderGap(days: number) {
  return render(
    <ol>
      <GapRow gap={gap(days)} />
    </ol>,
  );
}

describe("GapRow", () => {
  it("says how many days it stands in for", () => {
    renderGap(3);

    expect(screen.getByRole("listitem")).toHaveTextContent("3 days");
  });

  it("scales a long break down to months", () => {
    renderGap(97);

    expect(screen.getByRole("listitem")).toHaveTextContent("3 months");
  });
});
