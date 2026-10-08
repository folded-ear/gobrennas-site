import { PlanItemStatus } from "@/__generated__/graphql";
import { print } from "@apollo/client/utilities";
import { describe, expect, it } from "vitest";
import { changeMutation } from "./mutation";

describe("status mutation dates", () => {
  it("passes each cooking date to the backend and leaves ordinary status changes undated", () => {
    const doneAt = "2026-10-05T03:00:00.000Z";
    const { mutation, variables } = changeMutation([
      {
        kind: "status",
        id: "pie",
        name: "Pumpkin pie",
        planId: "7",
        status: PlanItemStatus.COMPLETED,
        doneAt,
      },
      {
        kind: "status",
        id: "cream",
        name: "Whipped cream",
        planId: "7",
        status: PlanItemStatus.ACQUIRED,
      },
    ]);
    const query = print(mutation);

    expect(query).toContain("$doneAt0: DateTime");
    expect(query).toContain(
      "s0: setStatus(id: $id0, status: $status0, doneAt: $doneAt0)",
    );
    expect(query).toContain(
      "s1: setStatus(id: $id1, status: $status1, doneAt: $doneAt1)",
    );
    expect(query).toContain("$doneAt1: DateTime");
    expect(variables).toEqual({
      id0: "pie",
      status0: PlanItemStatus.COMPLETED,
      doneAt0: doneAt,
      id1: "cream",
      status1: PlanItemStatus.ACQUIRED,
      doneAt1: null,
    });
  });
});

describe("store moves", () => {
  const sugarAfterFlour = {
    kind: "storeOrder",
    id: "p2",
    targetId: "p1",
    after: true,
    name: "sugar",
    storeOrders: { p2: 20.5 },
  } as const;

  it("puts a store move under pantry, beside the planner's changes", () => {
    const { mutation, variables } = changeMutation([
      {
        kind: "status",
        id: "cream",
        name: "Whipped cream",
        planId: "7",
        status: PlanItemStatus.ACQUIRED,
      },
      sugarAfterFlour,
    ]);
    const query = print(mutation);

    expect(query).toMatch(/planner \{\s+s0: setStatus\(/);
    expect(query).toMatch(
      /pantry \{\s+s1: orderForStore\(id: \$id1, targetId: \$targetId1, after: \$after1\)/,
    );
    expect(variables).toMatchObject({
      id0: "cream",
      id1: "p2",
      targetId1: "p1",
      after1: true,
    });
  });

  it("asks nothing of the planner when there's only a store move", () => {
    const query = print(changeMutation([sugarAfterFlour]).mutation);

    expect(query).not.toContain("planner");
    expect(query).toContain("s0: orderForStore(");
  });
});
