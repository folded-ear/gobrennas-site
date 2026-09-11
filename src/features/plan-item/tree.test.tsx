import { PlanItemStatus } from "@/__generated__/graphql";
import { PlanItemNode, TimelineItem } from "@/features/plan-timeline/model";
import {
  buildInMemoryCache,
  render,
  screen,
  seedFragment,
  userEvent,
  within,
} from "@/test";
import { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  PlanItemFragment,
  PlanItemFragmentDoc,
} from "./__generated__/planItem.generated";
import { PlanItemTree } from "./tree";

type Spec = {
  readonly id: string;
  readonly name: string;
  readonly children?: readonly Spec[];
};

const DINNER: Spec = {
  id: "1",
  name: "Thanksgiving dinner",
  children: [
    {
      id: "2",
      name: "Pumpkin pie",
      children: [
        { id: "3", name: "Pie crust", children: [{ id: "4", name: "Butter" }] },
      ],
    },
    { id: "5", name: "Roast turkey" },
  ],
};

function toNode({ id, name, children = [] }: Spec): PlanItemNode {
  const item: TimelineItem = {
    __typename: "PlanItem",
    id,
    name,
    bucket: null,
    children: children.map((c) => ({
      __typename: "PlanItem" as const,
      id: c.id,
    })),
  };
  return { item, children: children.map(toNode) };
}

function toFragment({ id, name }: Spec): PlanItemFragment {
  return {
    __typename: "PlanItem",
    id,
    name,
    status: PlanItemStatus.NEEDED,
    notes: null,
    preparation: null,
    parent: { __typename: "Plan", id: "7" },
    aggregate: null,
    ingredient: null,
    quantity: null,
    components: [],
    bucket: null,
  };
}

function flatten(specs: readonly Spec[]): readonly Spec[] {
  return specs.flatMap((s) => [s, ...flatten(s.children ?? [])]);
}

function renderTree(
  specs: readonly Spec[],
  onSelect?: (id: string) => void,
  renderItem?: (node: PlanItemNode) => ReactNode,
) {
  const cache = buildInMemoryCache();
  for (const spec of flatten(specs)) {
    seedFragment(cache, PlanItemFragmentDoc, "planItem", toFragment(spec));
  }
  return render(
    <PlanItemTree
      nodes={specs.map(toNode)}
      onSelect={onSelect}
      renderItem={renderItem}
    />,
    { cache },
  );
}

describe("PlanItemTree", () => {
  it("shows every item in the list", () => {
    renderTree([
      { id: "1", name: "Pumpkin pie" },
      { id: "2", name: "Roast turkey" },
    ]);

    expect(screen.getByRole("button", { name: "Pumpkin pie" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Roast turkey" })).toBeVisible();
  });

  it("nests a child inside its parent's list item", () => {
    renderTree([
      {
        id: "1",
        name: "Pumpkin pie",
        children: [{ id: "2", name: "Roast pumpkin" }],
      },
    ]);

    const [pie] = screen.getAllByRole("listitem");
    expect(
      within(pie).getByRole("button", { name: "Roast pumpkin" }),
    ).toBeVisible();
  });

  it("nests to arbitrary depth", () => {
    renderTree([DINNER]);

    expect(screen.getByRole("button", { name: "Butter" })).toBeVisible();
    expect(screen.getAllByRole("list")).toHaveLength(4);
  });

  it("renders no list at all when it has no items", () => {
    renderTree([]);

    expect(screen.queryByRole("list")).toBeNull();
  });

  it("reports which item was chosen, however deep", async () => {
    const onSelect = vi.fn();
    renderTree([DINNER], onSelect);

    await userEvent.click(screen.getByRole("button", { name: "Butter" }));

    expect(onSelect).toHaveBeenCalledWith("4");
  });

  it("draws each item's line with the renderer it's given, however deep", () => {
    renderTree([DINNER], undefined, (node) => (
      <span>Line for {node.item.name}</span>
    ));

    expect(screen.getByText("Line for Butter")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Butter" })).toBeNull();
  });
});
