import { describe, expect, it } from "vitest";
import { visiblePlanCount } from "./overflow";

describe("visiblePlanCount", () => {
  it("should use the full row without reserving overflow when all plans fit", () => {
    expect(visiblePlanCount(308, [100, 100, 100], 140, 4)).toBe(3);
  });
  it("should reserve overflow and gaps while keeping the original prefix", () => {
    expect(visiblePlanCount(350, [100, 100, 100, 100], 140, 4)).toBe(2);
  });
  it("should put everything in overflow when the first plan will not fit", () => {
    expect(visiblePlanCount(200, [150, 50], 100, 8)).toBe(0);
  });
  it("should show no plan controls for an empty list", () => {
    expect(visiblePlanCount(0, [], 100, 8)).toBe(0);
  });
});
