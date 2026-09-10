import { PlanItemStatus } from "@/__generated__/graphql";
import { PlanItemNode, TimelineItem } from "@/features/plan-timeline/model";
import { buildInMemoryCache } from "@/lib/apollo/build-in-memory-cache";
import { FragmentType } from "@apollo/client";
import { MockedProvider } from "@apollo/client/testing/react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  PlanItemFragment,
  PlanItemFragmentDoc,
} from "./__generated__/planItem.generated";
import { PlanItemDetail } from "./detail";

const PIE = { id: "42", name: "Pumpkin pie" };
const CRUST = { id: "43", name: "Pie crust" };

type Spec = { readonly id: string; readonly name: string };

/** What the component is really handed: an identity plus fragment refs. */
type ItemRef = FragmentType<PlanItemFragment> & {
  readonly __typename: "PlanItem";
  readonly id: string;
};

const PIE_REF: ItemRef = { __typename: "PlanItem", id: PIE.id };

function fragment({ id, name }: Spec, notes: string | null): PlanItemFragment {
  return {
    __typename: "PlanItem",
    id,
    name,
    status: PlanItemStatus.NEEDED,
    notes,
    preparation: null,
    parent: { __typename: "Plan", id: "7" },
    aggregate: null,
    ingredient: null,
    quantity: null,
    components: [],
    bucket: null,
  };
}

function node({ id, name }: Spec): PlanItemNode {
  const item: TimelineItem = {
    __typename: "PlanItem",
    id,
    name,
    bucket: null,
    children: [],
  };
  return { item, children: [] };
}

function renderDetail(
  notes: string | null,
  descendants: readonly PlanItemNode[],
  onSelect?: (id: string) => void,
) {
  const cache = buildInMemoryCache();
  for (const spec of [PIE, CRUST]) {
    cache.writeFragment({
      fragment: PlanItemFragmentDoc,
      fragmentName: "planItem",
      data: fragment(spec, spec === PIE ? notes : null),
    });
  }
  return render(
    <MockedProvider cache={cache}>
      <PlanItemDetail
        item={PIE_REF}
        descendants={descendants}
        onSelect={onSelect}
      />
    </MockedProvider>,
  );
}

describe("PlanItemDetail", () => {
  it("names the item it is showing", () => {
    renderDetail(null, []);

    expect(screen.getByRole("heading", { name: "Pumpkin pie" })).toBeVisible();
  });

  it("shows the item's notes when it has some", () => {
    renderDetail("Use the sugar pumpkin, not the jack-o-lantern one.", []);

    expect(screen.getByText(/Use the sugar pumpkin/)).toBeVisible();
  });

  it("shows what sits below the item", () => {
    renderDetail(null, [node(CRUST)]);

    expect(screen.getByRole("button", { name: "Pie crust" })).toBeVisible();
  });

  it("shows only the item when nothing sits below it", () => {
    renderDetail(null, []);

    expect(screen.queryByRole("list")).toBeNull();
  });

  it("passes a chosen descendant up", async () => {
    const onSelect = vi.fn();
    renderDetail(null, [node(CRUST)], onSelect);

    await userEvent.click(screen.getByRole("button", { name: "Pie crust" }));

    expect(onSelect).toHaveBeenCalledWith("43");
  });
});
