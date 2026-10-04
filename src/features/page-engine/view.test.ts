import { PlanItemStatus } from "@/__generated__/graphql";
import { describe, expect, it } from "vitest";
import type { Change, Pending, Phase } from "./state";
import {
  buildView,
  EMPTY_VIEW,
  overlayChildren,
  overlayDescendants,
} from "./view";

const PLAN = "7";

let seq = 0;
const pending = (change: Change, phase: Phase = "ready"): Pending => ({
  key: `k${++seq}`,
  seq,
  change,
  phase,
  kept: "kept",
});

describe("buildView", () => {
  it("shows a held removal as pending, and a released one as gone", () => {
    const view = buildView([
      pending(
        {
          kind: "status",
          id: "1",
          planId: PLAN,
          name: "Pumpkin pie",
          status: PlanItemStatus.COMPLETED,
        },
        "held",
      ),
      pending({
        kind: "status",
        id: "3",
        planId: PLAN,
        name: "Whipped cream",
        status: PlanItemStatus.DELETED,
      }),
    ]);

    expect(view.pendingStatus.get("1")).toBe(PlanItemStatus.COMPLETED);
    expect(view.removed.has("1")).toBe(false);
    expect(view.removed.has("3")).toBe(true);
  });

  it("shows the latest name, status and bucket", () => {
    const view = buildView([
      pending({ kind: "rename", id: "1", planId: PLAN, name: "Apple pie" }),
      pending({
        kind: "status",
        id: "1",
        planId: PLAN,
        name: "Apple pie",
        status: PlanItemStatus.ACQUIRED,
      }),
      pending({
        kind: "assignBucket",
        id: "1",
        planId: PLAN,
        name: "Apple pie",
        bucketId: "b2",
      }),
    ]);

    expect(view.name.get("1")).toBe("Apple pie");
    expect(view.status.get("1")).toBe(PlanItemStatus.ACQUIRED);
    expect(view.bucket.get("1")).toBe("b2");
  });

  it("keeps showing an answered change, for a later poll to retire", () => {
    const view = buildView([
      pending(
        { kind: "rename", id: "1", planId: PLAN, name: "Apple pie" },
        "answered",
      ),
    ]);

    expect(view.name.get("1")).toBe("Apple pie");
  });
});

describe("overlayChildren", () => {
  it("leaves a list nothing changed alone", () => {
    expect(overlayChildren(PLAN, ["1", "4"], EMPTY_VIEW)).toEqual(["1", "4"]);
  });

  it("places created items after their siblings, in order", () => {
    const view = buildView([
      pending({
        kind: "create",
        id: "draft:s",
        planId: PLAN,
        parentId: PLAN,
        afterId: "1",
        name: "Stuffing",
      }),
      pending({
        kind: "create",
        id: "draft:g",
        planId: PLAN,
        parentId: PLAN,
        afterId: "draft:s",
        name: "Gravy",
      }),
    ]);

    expect(overlayChildren(PLAN, ["1", "4"], view)).toEqual([
      "1",
      "draft:s",
      "draft:g",
      "4",
    ]);
  });

  it("moves items out of one parent and into another", () => {
    const view = buildView([
      pending({
        kind: "move",
        ids: ["2"],
        planId: PLAN,
        parentId: "4",
        afterId: null,
        name: "Pumpkin",
      }),
    ]);

    expect(overlayChildren("1", ["2", "5"], view)).toEqual(["5"]);
    expect(overlayChildren("4", ["6"], view)).toEqual(["2", "6"]);
  });

  it("reorders within a parent", () => {
    const view = buildView([
      pending({
        kind: "move",
        ids: ["1"],
        planId: PLAN,
        parentId: PLAN,
        afterId: "4",
        name: "Pumpkin pie",
      }),
    ]);

    expect(overlayChildren(PLAN, ["1", "3", "4", "5"], view)).toEqual([
      "3",
      "4",
      "1",
      "5",
    ]);
  });

  it("leaves out removed items", () => {
    const view = buildView([
      pending({
        kind: "status",
        id: "3",
        planId: PLAN,
        name: "Whipped cream",
        status: PlanItemStatus.COMPLETED,
      }),
    ]);

    expect(overlayChildren(PLAN, ["1", "3"], view)).toEqual(["1"]);
  });

  it("doesn't list a created item twice once the server lists it", () => {
    const view = buildView([
      pending(
        {
          kind: "create",
          id: "900",
          planId: PLAN,
          parentId: PLAN,
          afterId: "1",
          name: "Stuffing",
        },
        "answered",
      ),
    ]);

    expect(overlayChildren(PLAN, ["1", "900", "4"], view)).toEqual([
      "1",
      "900",
      "4",
    ]);
  });
});

describe("overlayDescendants", () => {
  const parents: Record<string, string> = { "1": PLAN, "2": "1", "4": PLAN };
  const parentOf = (id: string) => parents[id];

  it("leaves out a removed item and everything under it", () => {
    const view = buildView([
      pending({
        kind: "status",
        id: "1",
        planId: PLAN,
        name: "Pumpkin pie",
        status: PlanItemStatus.DELETED,
      }),
    ]);

    expect(overlayDescendants(PLAN, ["1", "2", "4"], view, parentOf)).toEqual([
      "4",
    ]);
  });

  it("adds items created in the plan", () => {
    const view = buildView([
      pending({
        kind: "create",
        id: "draft:s",
        planId: PLAN,
        parentId: "1",
        afterId: null,
        name: "Stuffing",
      }),
    ]);

    expect(overlayDescendants(PLAN, ["1", "2"], view, parentOf)).toEqual([
      "1",
      "2",
      "draft:s",
    ]);
  });
});
