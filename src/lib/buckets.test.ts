import { describe, expect, it } from "vitest";
import { bucketLabel, isNamedBucket } from "./buckets";

describe("isNamedBucket", () => {
  it.each([
    ["Dinner", true],
    [" dinner ", true],
    ["   ", false],
    [null, false],
  ])("calls a bucket named %j named: %s", (name, named) => {
    expect(isNamedBucket({ name })).toBe(named);
  });
});

describe("bucketLabel", () => {
  it("gives a named, dated bucket its name and day", () => {
    expect(bucketLabel("Dinner", "2026-10-06")).toMatch(/^Dinner – .*Oct 6$/);
  });

  it("gives a named, undated bucket just its name", () => {
    expect(bucketLabel("Dinner", null)).toBe("Dinner");
  });

  it("gives an unnamed, dated bucket just its day", () => {
    expect(bucketLabel(null, "2026-10-06")).toMatch(/^\w+, Oct 6$/);
  });

  it("gives a bucket with neither Unplanned", () => {
    expect(bucketLabel(null, null)).toBe("Unplanned");
  });
});
