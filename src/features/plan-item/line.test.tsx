import {
  buildPlanDirectory,
  PlanDirectoryProvider,
} from "@/features/plan-directory";
import { PlanItemNode } from "@/features/plan-timeline/model";
import { buildInMemoryCache, render, screen, seedFragment } from "@/test";
import { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { PlanItemFragmentDoc } from "./__generated__/planItem.generated";
import { PlanItemLine } from "./line";
import { planItemFragment } from "./test/fixtures";

const PIE = { id: "42", name: "Pumpkin pie" };
const CRUST = { id: "43", name: "Pie crust" };

function pieNode(childIds: readonly string[]): PlanItemNode {
  return {
    item: {
      __typename: "PlanItem",
      ...PIE,
      bucket: null,
      children: childIds.map((id) => ({ __typename: "PlanItem", id })),
    },
    children: [],
  };
}

type LineOptions = {
  /** The ids of what sits below the pie. */
  readonly childIds?: readonly string[];
  /** Whether the viewer owns the pie's plan, and so can change it. */
  readonly mine?: boolean;
  readonly showsPlan?: boolean;
  readonly chips?: ReactNode;
};

function renderLine({
  childIds = [],
  mine = true,
  showsPlan,
  chips,
}: LineOptions = {}) {
  const cache = buildInMemoryCache();
  seedFragment(cache, PlanItemFragmentDoc, "planItem", planItemFragment(PIE));
  const directory = buildPlanDirectory([
    {
      id: "7",
      name: "Holidays",
      color: "#F57F17",
      mine,
      grants: [],
      descendants: [PIE, CRUST],
      buckets: [],
    },
  ]);
  render(
    <PlanDirectoryProvider directory={directory}>
      <PlanItemLine
        node={pieNode(childIds)}
        zones={[]}
        showsPlan={showsPlan}
        chips={chips}
      >
        <span>{PIE.name}</span>
      </PlanItemLine>
    </PlanDirectoryProvider>,
    { cache },
  );
}

describe("PlanItemLine", () => {
  it("shows the name it's given, with its item's status and delete", () => {
    renderLine();

    expect(
      screen.getByRole("button", { name: "Mark acquired: Pumpkin pie" }),
    ).toBeVisible();
    expect(screen.getByText("Pumpkin pie")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Delete: Pumpkin pie" }),
    ).toBeVisible();
  });

  it("shows a viewer who can't change the plan a status, and no delete", () => {
    renderLine({ mine: false });

    expect(screen.getByRole("img", { name: "Needed" })).toBeVisible();
    expect(screen.getByText("Pumpkin pie")).toBeVisible();
    expect(screen.queryByRole("button", { name: /^Delete/ })).toBeNull();
  });

  it("links to cook an item with something below it", () => {
    renderLine({ childIds: [CRUST.id] });

    expect(
      screen.getByRole("link", { name: "Cook Pumpkin pie" }),
    ).toBeVisible();
  });

  it("offers nothing to cook for an item with nothing below it", () => {
    renderLine();

    expect(screen.getByText("Pumpkin pie")).toBeVisible();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("says which plan its item is from when asked", () => {
    renderLine({ showsPlan: true });

    expect(screen.getByRole("img", { name: "Holidays" })).toBeVisible();
  });

  it("says nothing of its item's plan unless asked", () => {
    renderLine();

    expect(screen.getByText("Pumpkin pie")).toBeVisible();
    expect(screen.queryByRole("img", { name: "Holidays" })).toBeNull();
  });

  it("shows the chips it's given", () => {
    renderLine({ chips: <span>Sat, Sep 12</span> });

    expect(screen.getByText("Sat, Sep 12")).toBeVisible();
  });
});
