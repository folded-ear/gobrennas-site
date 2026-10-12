import { describe, expect, it } from "vitest";
import {
  ADD_RECIPE_PATH,
  addRecipeFromPhotoHref,
  bucketCookHref,
  parseBucketCookIds,
  photoJobOf,
} from "./routes";

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

  it("reads each id once, in the order it first came", () => {
    expect(parseBucketCookIds("9,7,9")).toEqual(["9", "7"]);
  });

  it("reads no empty ids", () => {
    expect(parseBucketCookIds(",7,,9,")).toEqual(["7", "9"]);
  });

  it("reads no ids from a segment that won't decode", () => {
    expect(parseBucketCookIds("7%E0")).toEqual([]);
  });
});

describe("adding a recipe from a photo", () => {
  it("names the photo's job on the add form's address", () => {
    expect(addRecipeFromPhotoHref("8777749749830")).toBe(
      `${ADD_RECIPE_PATH}?job=8777749749830`,
    );
  });

  it("reads back the job an address names", () => {
    const address = new URL(
      addRecipeFromPhotoHref("a job/with odd&characters"),
      "https://gobrennas.example",
    );

    expect(photoJobOf(address.searchParams.get("job") ?? undefined)).toBe(
      "a job/with odd&characters",
    );
  });

  it.each([[undefined], [""], [["8777749749830", "8777749749831"]]])(
    "reads no job from %j",
    (value) => {
      expect(photoJobOf(value)).toBeUndefined();
    },
  );
});
