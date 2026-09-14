import {
  buildPlanDirectory,
  PlanDirectoryProvider,
} from "@/features/plan-directory";
import {
  TimelineBucketSection,
  TimelineDay,
} from "@/features/plan-timeline/model";
import { render, screen, within } from "@/test";
import { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { PlanSectionHeader } from "./section-header";

const SATURDAY: TimelineDay = { kind: "day", date: "2026-09-12", roots: [] };
const PREP: TimelineBucketSection = {
  kind: "bucket",
  key: "bucket:prep@2026-09-11",
  bucketIds: ["hPrep", "wPrep"],
  name: "Prep",
  date: "2026-09-11",
  roots: [],
};

function withPlans(ui: ReactElement) {
  return (
    <PlanDirectoryProvider
      directory={buildPlanDirectory([
        {
          id: "7",
          name: "Holidays",
          color: "#F57F17",
          mine: true,
          descendants: [],
          buckets: [{ id: "hPrep" }],
        },
        {
          id: "9",
          name: "Weeknights",
          color: "#1E88E5",
          mine: true,
          descendants: [],
          buckets: [{ id: "wPrep" }],
        },
      ])}
    >
      {ui}
    </PlanDirectoryProvider>
  );
}

describe("PlanSectionHeader", () => {
  it("heads a day's screen with the day, and no plans", () => {
    render(withPlans(<PlanSectionHeader section={SATURDAY} />));

    const heading = screen.getByRole("heading", { name: "Sat, Sep 12" });
    expect(within(heading).queryByRole("img")).toBeNull();
  });

  it("heads a bucket's screen with its name, date, and every plan it spans", () => {
    render(withPlans(<PlanSectionHeader section={PREP} />));

    const heading = screen.getByRole("heading", {
      name: /^Prep – Fri, Sep 11/,
    });
    expect(
      within(heading)
        .getAllByRole("img")
        .map((dot) => dot.getAttribute("aria-label")),
    ).toEqual(["Holidays", "Weeknights"]);
  });
});
