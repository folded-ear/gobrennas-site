import { UNNAMED } from "@/lib/plan-item-name";
import { describe, expect, it } from "vitest";
import { buildPlanTree } from "./moves";
import { treeZones } from "./tree-zones";
import { TREE_ZONES } from "./zones";

const TREE = buildPlanTree([
  { id: "plan", children: [{ id: "2" }, { id: "5" }, { id: "7" }] },
  { id: "2", children: [] },
  { id: "5", children: [] },
  { id: "7", children: [] },
]);

function labelsOn(name: string): readonly string[] {
  return treeZones({
    tree: TREE,
    dragged: { id: "7", name: "Cranberry sauce" },
    target: { id: "2", name },
    rects: TREE_ZONES,
    onMove: () => {},
  }).map((zone) => zone.label);
}

describe("treeZones", () => {
  it("labels each zone with its target's name", () => {
    expect(labelsOn("Pumpkin pie")).toEqual([
      "Put before Pumpkin pie",
      "Nest under Pumpkin pie",
      "Put after Pumpkin pie",
    ]);
  });

  it("labels the zones on a blank-named target as unnamed", () => {
    expect(labelsOn("  ")).toEqual([
      `Put before ${UNNAMED}`,
      `Nest under ${UNNAMED}`,
      `Put after ${UNNAMED}`,
    ]);
  });
});
