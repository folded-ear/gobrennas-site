import { describe, expect, it } from "vitest";
import { pickerOrder, resolveSelection } from "./selection";

const WEEKNIGHTS = { id: "1", mine: true };
const NEIGHBOR = { id: "3", mine: false };
const FEAST_DAY = { id: "2", mine: true };
const PLANS = [WEEKNIGHTS, NEIGHBOR, FEAST_DAY];

describe("pickerOrder", () => {
  it("lists the user's own plans before shared ones, keeping order", () => {
    expect(pickerOrder(PLANS)).toEqual([WEEKNIGHTS, FEAST_DAY, NEIGHBOR]);
  });
});

describe("resolveSelection", () => {
  it("keeps stored plans, in picker order", () => {
    expect(resolveSelection(["3", "2"], PLANS, "multiple")).toEqual(["2", "3"]);
  });

  it("drops stored ids naming no accessible plan", () => {
    expect(resolveSelection(["gone", "3"], PLANS, "multiple")).toEqual(["3"]);
  });

  it("falls back to the first plan in picker order when nothing's stored", () => {
    expect(resolveSelection([], [NEIGHBOR, FEAST_DAY], "multiple")).toEqual([
      "2",
    ]);
  });

  it("falls back when nothing stored is still accessible", () => {
    expect(resolveSelection(["gone"], PLANS, "single")).toEqual(["1"]);
  });

  it("selects at most one plan in single mode", () => {
    expect(resolveSelection(["3", "2"], PLANS, "single")).toEqual(["3"]);
  });

  it("selects nothing when there are no plans", () => {
    expect(resolveSelection(["1"], [], "multiple")).toEqual([]);
  });
});
