import { describe, expect, it } from "vitest";
import { bucketCookHref, parseBucketCookIds } from "./routes";

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

describe("parseBucketCookIds", () => {
  it("reads back the ids a bucket cook path lists", () => {
    const [, , , , planIds, bucketIds] = bucketCookHref(
      "Dinner",
      null,
      ["7", "9"],
      ["30", "44"],
    ).split("/");

    expect(parseBucketCookIds(planIds)).toEqual(["7", "9"]);
    expect(parseBucketCookIds(bucketIds)).toEqual(["30", "44"]);
  });

  it("reads ids whose separator arrived encoded", () => {
    expect(parseBucketCookIds(encodeURIComponent("7,9"))).toEqual(["7", "9"]);
  });
});
