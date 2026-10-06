import { AccessLevel } from "@/__generated__/graphql";
import type { TimelineSection } from "@/features/plan-timeline/model";
import { describe, expect, it } from "vitest";
import {
  canAddToSection,
  destinationBucket,
  type AddPlan,
} from "./destination";

const day: TimelineSection = {
  kind: "day",
  date: "2026-10-02",
  bucketIds: [],
  roots: [],
};
const named: TimelineSection = {
  kind: "bucket",
  key: "bucket:lunch@2026-10-02",
  name: "Lunch",
  date: "2026-10-02",
  bucketIds: ["named"],
  roots: [],
};
const plan: AddPlan = {
  __typename: "Plan",
  id: "plan",
  name: "My plan",
  color: "#ff0000",
  mine: true,
  children: [],
  grants: [],
  buckets: [
    { id: "named", name: " lunch ", date: "2026-10-02" },
    { id: "day", name: null, date: "2026-10-02" },
    { id: "tomorrow", name: "Lunch", date: "2026-10-03" },
  ],
};

describe("Add destination", () => {
  it("keeps a day's items separate from named buckets on the same date", () => {
    expect(destinationBucket(plan, day)).toBe("day");
    expect(
      destinationBucket({ ...plan, buckets: [plan.buckets[0]] }, day),
    ).toBeUndefined();
    expect(destinationBucket(plan, named)).toBe("named");
    expect(
      destinationBucket(plan, { kind: "unplanned", roots: [] }),
    ).toBeUndefined();
  });

  it.each([AccessLevel.CHANGE, AccessLevel.ADMINISTER])(
    "lets %s collaborators add to existing buckets and Unplanned",
    (level) => {
      const shared = {
        ...plan,
        mine: false,
        grants: [{ level, user: { me: true } }],
      };
      expect(canAddToSection(shared, day)).toBe(true);
      expect(canAddToSection(shared, named)).toBe(true);
      expect(canAddToSection(shared, { kind: "unplanned", roots: [] })).toBe(
        true,
      );
    },
  );

  it("requires the user's own administer grant to create a missing bucket", () => {
    const shared = {
      ...plan,
      mine: false,
      buckets: [],
      grants: [
        { level: AccessLevel.CHANGE, user: { me: true } },
        { level: AccessLevel.ADMINISTER, user: { me: false } },
      ],
    };
    expect(canAddToSection(shared, day)).toBe(false);
    expect(
      canAddToSection(
        {
          ...shared,
          grants: [{ level: AccessLevel.ADMINISTER, user: { me: true } }],
        },
        day,
      ),
    ).toBe(true);
    expect(canAddToSection({ ...shared, mine: true }, day)).toBe(true);
    expect(canAddToSection({ ...plan, mine: false }, day)).toBe(false);
  });
});
