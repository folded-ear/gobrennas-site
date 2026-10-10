import { buildEntries, Draft } from "@/features/plan-edit";
import { PlanItemNode, TimelineItem } from "@/features/plan-timeline/model";
import { render, screen, within } from "@/test";
import { ReactNode } from "react";
import { describe, expect, it } from "vitest";
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

const PIE: Spec = {
  id: "1",
  name: "Pumpkin pie",
  children: [{ id: "2", name: "Roast pumpkin" }],
};

/** A new item, first under the pie. */
const NEW_UNDER_PIE: Draft = {
  draftId: "new-1",
  planId: "7",
  parentId: PIE.id,
  afterId: null,
  beside: { firstIn: PIE.id },
};

function renderTree(
  specs: readonly Spec[],
  renderItem = (node: PlanItemNode) => <span>{node.item.name}</span>,
) {
  return render(
    <PlanItemTree
      entries={buildEntries(specs.map(toNode), [], null)}
      renderItem={renderItem}
    />,
  );
}

function renderTreeWithDraft(renderDraft?: (draft: Draft) => ReactNode) {
  return render(
    <PlanItemTree
      entries={buildEntries([toNode(PIE)], [NEW_UNDER_PIE], null)}
      renderItem={(node) => <span>{node.item.name}</span>}
      renderDraft={renderDraft}
    />,
  );
}

describe("PlanItemTree", () => {
  it("shows every item in the list", () => {
    renderTree([
      { id: "1", name: "Pumpkin pie" },
      { id: "2", name: "Roast turkey" },
    ]);

    expect(screen.getByText("Pumpkin pie")).toBeVisible();
    expect(screen.getByText("Roast turkey")).toBeVisible();
  });

  it("nests a child inside its parent's list item", () => {
    renderTree([PIE]);

    const [pie] = screen.getAllByRole("listitem");
    expect(within(pie).getByText("Roast pumpkin")).toBeVisible();
  });

  it("nests to arbitrary depth", () => {
    renderTree([DINNER]);

    expect(screen.getByText("Butter")).toBeVisible();
    expect(screen.getAllByRole("list")).toHaveLength(4);
  });

  it("renders no list at all when it has no items", () => {
    renderTree([]);

    expect(screen.queryByRole("list")).toBeNull();
  });

  it("draws each item's line with the renderer it's given, however deep", () => {
    renderTree([DINNER], (node) => <span>Line for {node.item.name}</span>);

    expect(screen.getByText("Line for Butter")).toBeVisible();
    expect(screen.getByText("Line for Thanksgiving dinner")).toBeVisible();
  });

  it("shows a new item among the rows of the item it's under", () => {
    renderTreeWithDraft((draft) => <span>New item {draft.draftId}</span>);

    const [pie, added, pumpkin] = screen.getAllByRole("listitem");
    expect(within(pie).getByText("New item new-1")).toBeVisible();
    expect(added).toHaveTextContent("New item new-1");
    expect(pumpkin).toHaveTextContent("Roast pumpkin");
  });

  it("leaves new items out when it has no way to draw them", () => {
    renderTreeWithDraft();

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Roast pumpkin")).toBeVisible();
  });
});
