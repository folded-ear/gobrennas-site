import { describe, expect, it } from "vitest";
import { orderPlans } from "./plans";

const WEEKNIGHTS = { id: "1", mine: true };
const NEIGHBOR = { id: "3", mine: false };
const FEAST_DAY = { id: "2", mine: true };

describe("orderPlans", () => {
  it("lists the user's own plans before shared ones, keeping order", () => {
    expect(orderPlans([WEEKNIGHTS, NEIGHBOR, FEAST_DAY])).toEqual([
      WEEKNIGHTS,
      FEAST_DAY,
      NEIGHBOR,
    ]);
  });
});
