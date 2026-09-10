import { PlanItemStatus } from "@/__generated__/graphql";
import { buildInMemoryCache } from "@/lib/apollo/build-in-memory-cache";
import { FragmentType } from "@apollo/client";
import { MockedProvider } from "@apollo/client/testing/react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  PlanItemFragment,
  PlanItemFragmentDoc,
} from "./__generated__/planItem.generated";
import { PlanItem } from "./index";

/** What the component is really handed: an identity plus fragment refs. */
type ItemRef = FragmentType<PlanItemFragment> & {
  readonly __typename: "PlanItem";
  readonly id: string;
};

const PUMPKIN_PIE_REF: ItemRef = { __typename: "PlanItem", id: "42" };

const PUMPKIN_PIE: PlanItemFragment = {
  __typename: "PlanItem",
  id: "42",
  name: "Pumpkin pie",
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

function renderWith(item: PlanItemFragment, ui: ReactNode) {
  const cache = buildInMemoryCache();
  cache.writeFragment({
    fragment: PlanItemFragmentDoc,
    fragmentName: "planItem",
    data: item,
  });
  return render(<MockedProvider cache={cache}>{ui}</MockedProvider>);
}

describe("PlanItem", () => {
  it("shows the item's name", () => {
    renderWith(PUMPKIN_PIE, <PlanItem item={PUMPKIN_PIE_REF} />);

    expect(screen.getByRole("button", { name: "Pumpkin pie" })).toBeVisible();
  });

  it("reports its own id when chosen", async () => {
    const onSelect = vi.fn();
    renderWith(
      PUMPKIN_PIE,
      <PlanItem item={PUMPKIN_PIE_REF} onSelect={onSelect} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Pumpkin pie" }));

    expect(onSelect).toHaveBeenCalledWith("42");
  });
});
