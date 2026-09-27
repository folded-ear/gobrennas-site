import { AccessLevel } from "@/__generated__/graphql";
import { describe, expect, it } from "vitest";
import { canChangePlan, orderPlans } from "./plans";

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

describe("canChangePlan", () => {
  it("lets the owner change their plan", () => {
    expect(canChangePlan({ mine: true, grants: [] })).toBe(true);
  });

  it.each([AccessLevel.CHANGE, AccessLevel.ADMINISTER])(
    "lets a user granted %s change the plan",
    (level) => {
      expect(
        canChangePlan({ mine: false, grants: [{ level, user: { me: true } }] }),
      ).toBe(true);
    },
  );

  it("won't let a user granted only VIEW change the plan", () => {
    expect(
      canChangePlan({
        mine: false,
        grants: [{ level: AccessLevel.VIEW, user: { me: true } }],
      }),
    ).toBe(false);
  });

  it("ignores grants made to someone else", () => {
    expect(
      canChangePlan({
        mine: false,
        grants: [{ level: AccessLevel.CHANGE, user: { me: false } }],
      }),
    ).toBe(false);
  });
});
