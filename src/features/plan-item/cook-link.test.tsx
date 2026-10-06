import {
  buildPlanDirectory,
  PlanDirectoryProvider,
} from "@/features/plan-directory";
import {
  PlanItemNode,
  TimelineBucketSection,
  TimelineDay,
} from "@/features/plan-timeline/model";
import { render, screen } from "@/test";
import { describe, expect, it } from "vitest";
import { bucketCookHref, BucketCookLink, CookLink } from "./cook-link";

describe("CookLink", () => {
  it("links to the item's cook view, naming the item", () => {
    render(<CookLink planId="7" itemId="42" name="Pumpkin pie" />);

    expect(
      screen.getByRole("link", { name: "Cook Pumpkin pie" }),
    ).toHaveAttribute("href", "/plan/7/recipe/42");
  });
});

describe("bucketCookHref", () => {
  it.each([
    ["Dinner", "2026-10-06", "/planner/cook/dinner@2026-10-06/7/30"],
    ["Dinner", null, "/planner/cook/dinner/7/30"],
    ["  Big Game / Party! ", null, "/planner/cook/big-game-party/7/30"],
    ["Crème brûlée", null, "/planner/cook/creme-brulee/7/30"],
    ["🎃", "2026-10-31", "/planner/cook/bucket@2026-10-31/7/30"],
    [null, "2026-10-06", "/planner/cook/2026-10-06/7/30"],
  ])("labels %j on %j as %s", (name, date, href) => {
    expect(bucketCookHref(name, date, ["7"], ["30"])).toBe(href);
  });

  it("lists every plan and bucket", () => {
    expect(bucketCookHref("Dinner", null, ["7", "9"], ["30", "44"])).toBe(
      "/planner/cook/dinner/7,9/30,44",
    );
  });
});

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

const PREP: TimelineBucketSection = {
  kind: "bucket",
  key: "bucket:prep@2026-09-11",
  bucketIds: ["wPrep", "hPrep"],
  name: "Prep",
  date: "2026-09-11",
  roots: [TACOS],
};

const SATURDAY: TimelineDay = {
  kind: "day",
  date: "2026-09-12",
  bucketIds: ["wSat", "hSat"],
  roots: [TACOS],
};

function renderBucketLink(section: TimelineBucketSection | TimelineDay) {
  return render(
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
          buckets: [{ id: "wPrep" }, { id: "wSat" }],
        },
      ])}
    >
      <BucketCookLink section={section} />
    </PlanDirectoryProvider>,
  );
}

describe("BucketCookLink", () => {
  it("links to the bucket's cook view across its plans, naming it", () => {
    renderBucketLink(PREP);

    expect(
      screen.getByRole("link", { name: /^Cook Prep – Fri, Sep 11/ }),
    ).toHaveAttribute("href", "/planner/cook/prep@2026-09-11/7,9/wPrep,hPrep");
  });

  it("links to a day's cook view across its plans, naming it", () => {
    renderBucketLink(SATURDAY);

    expect(
      screen.getByRole("link", { name: "Cook Sat, Sep 12" }),
    ).toHaveAttribute("href", "/planner/cook/2026-09-12/7,9/wSat,hSat");
  });

  it("offers nothing to cook in a bucket holding nothing", () => {
    renderBucketLink({ ...PREP, roots: [] });

    expect(screen.queryByRole("link")).toBeNull();
  });
});
