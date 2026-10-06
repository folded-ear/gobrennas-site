import { render, screen } from "@/test";
import { describe, expect, it } from "vitest";
import { BucketCookLink } from "./bucket-cook-link";
import { PlanItemNode, TimelineBucketSection, TimelineDay } from "./model";

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

function renderBucketLink(
  section: TimelineBucketSection | TimelineDay,
  planIds: readonly string[] = ["7", "9"],
) {
  return render(<BucketCookLink section={section} planIds={planIds} />);
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

  it("offers nowhere to cook a bucket without plans", () => {
    renderBucketLink(PREP, []);

    expect(screen.queryByRole("link")).toBeNull();
  });
});
