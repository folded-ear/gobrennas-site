import { describe, expect, it } from "vitest";
import {
  addDays,
  diffDays,
  formatDayLabel,
  formatGapLabel,
  localDate,
} from "./dates";

describe("localDate", () => {
  it("reads local calendar parts, not the UTC instant", () => {
    // 23:30 local on the 9th is already the 10th in UTC east of nothing,
    // and the 9th is what a person planning dinner means.
    expect(localDate(new Date(2026, 8, 9, 23, 30))).toBe("2026-09-09");
  });

  it("pads single-digit months and days", () => {
    expect(localDate(new Date(2026, 0, 5, 12, 0))).toBe("2026-01-05");
  });
});

describe("addDays", () => {
  it("crosses a month boundary", () => {
    expect(addDays("2026-09-28", 5)).toBe("2026-10-03");
  });

  it("crosses a year boundary", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
  });

  it("counts backwards", () => {
    expect(addDays("2026-03-02", -3)).toBe("2026-02-27");
  });

  it("handles a leap day", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("advances one calendar day across a DST transition", () => {
    // US DST starts 2026-03-08. Adding 24h in local time lands at 23:00
    // on the same date, so a local-time implementation returns 03-08.
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09");
    // ...and ends 2026-11-01, where the day is 25h long.
    expect(addDays("2026-11-01", 1)).toBe("2026-11-02");
  });
});

describe("diffDays", () => {
  it("counts forward", () => {
    expect(diffDays("2026-09-09", "2026-09-15")).toBe(6);
  });

  it("signs backwards spans", () => {
    expect(diffDays("2026-09-15", "2026-09-09")).toBe(-6);
  });

  it("counts across a DST transition", () => {
    expect(diffDays("2026-03-07", "2026-03-09")).toBe(2);
  });
});

describe("formatDayLabel", () => {
  it("labels the calendar date it was given", () => {
    // Parsing the ISO string as a UTC instant and then formatting it in a
    // local zone behind UTC yields the 8th. Any locale shows the number.
    const label = formatDayLabel("2026-09-09");
    expect(label).toMatch(/\b9\b/);
    expect(label).not.toMatch(/\b8\b/);
  });

  it("distinguishes adjacent days", () => {
    expect(formatDayLabel("2026-09-09")).not.toBe(formatDayLabel("2026-09-10"));
  });
});

describe("formatGapLabel", () => {
  it("counts short gaps in days", () => {
    expect(formatGapLabel(3)).toBe("3 days");
    expect(formatGapLabel(13)).toBe("13 days");
  });

  it("says day, not days, for one", () => {
    expect(formatGapLabel(1)).toBe("1 day");
  });

  it("switches to weeks once days stop reading well", () => {
    expect(formatGapLabel(14)).toBe("2 weeks");
    expect(formatGapLabel(42)).toBe("6 weeks");
  });

  it("switches to months rather than counting a winter break in days", () => {
    expect(formatGapLabel(97)).toBe("3 months");
  });
});
