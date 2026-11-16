import { describe, expect, it } from "vitest";
import { formatCookSummary } from "./summary";

describe("formatCookSummary", () => {
  // a Sunday afternoon, local time
  const now = new Date(2026, 10, 8, 15, 0);
  const yesterday = new Date(2026, 10, 7, 18, 30).toISOString();
  const tenDaysAgo = new Date(2026, 9, 29, 12, 0).toISOString();

  it("says a recipe was cooked once, and when", () => {
    expect(formatCookSummary(1, yesterday, now)).toBe("Cooked once yesterday");
  });

  it("says once before when cooked twice", () => {
    expect(formatCookSummary(2, yesterday, now)).toBe(
      "Last cooked yesterday, and once before",
    );
  });

  it("counts the times before the last", () => {
    expect(formatCookSummary(74, tenDaysAgo, now)).toBe(
      "Last cooked Thu, Oct 29, and 73 times before",
    );
  });
});
