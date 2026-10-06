import {
  buildPlanDirectory,
  PlanDirectoryProvider,
} from "@/features/plan-directory";
import {
  PlanItemNode,
  TimelineBucketSection,
  TimelineDay,
  TimelineUnplanned,
} from "@/features/plan-timeline/model";
import { render, screen, within } from "@/test";
import { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { PlanSectionHeader } from "./section-header";

const TACOS: PlanItemNode = {
  item: {
    __typename: "PlanItem",
    id: "1",
    name: "Tacos",
    bucket: null,
    children: [],
  },
  children: [],
};

const SATURDAY: TimelineDay = {
  kind: "day",
  date: "2026-09-12",
  bucketIds: ["hSat"],
  roots: [],
};
const UNPLANNED: TimelineUnplanned = { kind: "unplanned", roots: [TACOS] };
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
          grants: [],
          descendants: [],
          buckets: [{ id: "hPrep" }, { id: "hSat" }],
        },
        {
          id: "9",
          name: "Weeknights",
          color: "#1E88E5",
          mine: true,
          grants: [],
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

  it("links to cooking a bucket with anything in it", () => {
    render(
      withPlans(<PlanSectionHeader section={{ ...PREP, roots: [TACOS] }} />),
    );

    expect(
      screen.getByRole("link", { name: /^Cook Prep – Fri, Sep 11/ }),
    ).toBeVisible();
  });

  it("links to cooking a day with anything in it", () => {
    render(
      withPlans(
        <PlanSectionHeader section={{ ...SATURDAY, roots: [TACOS] }} />,
      ),
    );

    expect(
      screen.getByRole("link", { name: "Cook Sat, Sep 12" }),
    ).toBeVisible();
  });

  it("offers no cooking for Unplanned", () => {
    render(withPlans(<PlanSectionHeader section={UNPLANNED} />));

    expect(screen.queryByRole("link", { name: /^Cook / })).toBeNull();
  });
});
