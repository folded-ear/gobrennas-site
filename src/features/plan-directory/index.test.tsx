import { renderHook } from "@/test";
import { PropsWithChildren } from "react";
import { describe, expect, it } from "vitest";
import {
  buildPlanDirectory,
  DirectorySource,
  PlanDirectoryProvider,
  useBucketPlans,
  useItemPlan,
  useItemPlanLookup,
  useShowsPlanIndicators,
} from ".";

const NEIGHBOR: DirectorySource = {
  id: "3",
  name: "Neighborhood potluck",
  color: "#1E88E5",
  mine: false,
  descendants: [{ id: "31" }],
  buckets: [{ id: "b3" }],
};
const WEEKNIGHTS: DirectorySource = {
  id: "1",
  name: "Weeknights",
  color: "#F57F17",
  mine: true,
  descendants: [{ id: "11" }, { id: "12" }],
  buckets: [{ id: "b1" }],
};

function within(plans: readonly DirectorySource[]) {
  const directory = buildPlanDirectory(plans);
  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <PlanDirectoryProvider directory={directory}>
        {children}
      </PlanDirectoryProvider>
    );
  };
}

describe("useItemPlan", () => {
  it("gives the plan an item belongs to", () => {
    const { result } = renderHook(() => useItemPlan("12"), {
      wrapper: within([NEIGHBOR, WEEKNIGHTS]),
    });

    expect(result.current).toEqual({
      id: "1",
      name: "Weeknights",
      color: "#F57F17",
    });
  });

  it("gives nothing for an item no plan holds", () => {
    const { result } = renderHook(() => useItemPlan("99"), {
      wrapper: within([WEEKNIGHTS]),
    });

    expect(result.current).toBeUndefined();
  });

  it("gives nothing outside a directory", () => {
    const { result } = renderHook(() => useItemPlan("12"));

    expect(result.current).toBeUndefined();
  });
});

describe("useItemPlanLookup", () => {
  it("looks up the plan of any item asked about", () => {
    const { result } = renderHook(() => useItemPlanLookup(), {
      wrapper: within([NEIGHBOR, WEEKNIGHTS]),
    });

    expect(result.current("31")?.name).toBe("Neighborhood potluck");
    expect(result.current("11")?.name).toBe("Weeknights");
    expect(result.current("99")).toBeUndefined();
  });
});

describe("useBucketPlans", () => {
  it("gives each bucket's plan once, in plan order", () => {
    const { result } = renderHook(
      () => useBucketPlans(["b3", "b1", "b3", "gone"]),
      { wrapper: within([NEIGHBOR, WEEKNIGHTS]) },
    );

    expect(result.current.map((p) => p.name)).toEqual([
      "Weeknights",
      "Neighborhood potluck",
    ]);
  });
});

describe("useShowsPlanIndicators", () => {
  it("shows indicators with two or more plans", () => {
    const { result } = renderHook(() => useShowsPlanIndicators(), {
      wrapper: within([NEIGHBOR, WEEKNIGHTS]),
    });

    expect(result.current).toBe(true);
  });

  it("shows none with only one plan", () => {
    const { result } = renderHook(() => useShowsPlanIndicators(), {
      wrapper: within([WEEKNIGHTS]),
    });

    expect(result.current).toBe(false);
  });

  it("shows none outside a directory", () => {
    const { result } = renderHook(() => useShowsPlanIndicators());

    expect(result.current).toBe(false);
  });
});
