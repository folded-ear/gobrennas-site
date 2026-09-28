import { PlanItemStatus } from "@/__generated__/graphql";
import {
  DirectoryPlan,
  PlanDirectory,
  PlanDirectoryProvider,
} from "@/features/plan-directory";
import { TOGGLE_LOOKS, ToggleStatus } from "@/features/plan-status";
import { buildInMemoryCache, render, screen, seedFragment } from "@/test";
import { describe, expect, it } from "vitest";
import {
  PlanItemFragment,
  PlanItemFragmentDoc,
} from "./__generated__/planItem.generated";
import { PlanItemRow, RowAncestor } from "./row";

const WEEKNIGHTS: DirectoryPlan = {
  id: "7",
  name: "Weeknights",
  color: "#F57F17",
  changeable: true,
};
const PARTY: DirectoryPlan = {
  id: "9",
  name: "Party",
  color: "#1E88E5",
  changeable: true,
};

const SUGAR: PlanItemFragment = {
  __typename: "PlanItem",
  id: "42",
  name: "1 tsp sugar",
  status: PlanItemStatus.NEEDED,
  notes: null,
  preparation: null,
  parent: { __typename: "PlanItem", id: "41" },
  aggregate: { __typename: "PlanItem", id: "41" },
  ingredient: { __typename: "PantryItem", id: "p2" },
  quantity: {
    __typename: "Quantity",
    quantity: 1,
    units: { __typename: "UnitOfMeasure", id: "u3", name: "tsp" },
  },
  components: [],
  bucket: null,
};

const ANCESTORS: readonly RowAncestor[] = [
  { id: "41", name: "Spag sauce", acquired: false },
  { id: "40", name: "Dinner", acquired: false },
];

function directoryOf(plans: readonly DirectoryPlan[]): PlanDirectory {
  return { plans, planOfItem: new Map(), planOfBucket: new Map() };
}

function renderRow(
  data: PlanItemFragment,
  plans: readonly DirectoryPlan[] = [WEEKNIGHTS],
  ancestors: readonly RowAncestor[] = ANCESTORS,
  countsAs: ToggleStatus = PlanItemStatus.NEEDED,
) {
  const cache = buildInMemoryCache();
  const item = seedFragment(cache, PlanItemFragmentDoc, "planItem", data);
  render(
    <PlanDirectoryProvider directory={directoryOf(plans)}>
      <PlanItemRow
        item={item}
        ancestors={ancestors}
        plan={WEEKNIGHTS}
        countsAs={countsAs}
      />
    </PlanDirectoryProvider>,
    { cache },
  );
}

describe("PlanItemRow", () => {
  it("shows the item, then its ancestors nearest first", () => {
    renderRow(SUGAR);

    expect(screen.getByText("1 tsp sugar")).toBeVisible();
    expect(screen.getByText("Spag sauce / Dinner")).toBeVisible();
  });

  it("offers to acquire its item", () => {
    renderRow(SUGAR);

    expect(
      screen.getByRole("button", { name: "Mark acquired: 1 tsp sugar" }),
    ).toBeVisible();
  });

  it("leaves its plan out when there's only one", () => {
    renderRow(SUGAR);

    expect(screen.queryByText(/Weeknights/)).toBeNull();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("ends its ancestry with its dotted plan when there are several", () => {
    renderRow(SUGAR, [WEEKNIGHTS, PARTY]);

    expect(screen.getByText("Spag sauce / Dinner / Weeknights")).toBeVisible();
    // the plan's dot, and nothing for its ancestors
    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(screen.getByRole("img", { name: "Weeknights" })).toBeVisible();
  });

  it("shows an item counted as acquired in acquired's color, and why", () => {
    renderRow(
      SUGAR,
      [WEEKNIGHTS],
      [
        { id: "41", name: "Spag sauce", acquired: true },
        { id: "40", name: "Dinner", acquired: false },
      ],
      PlanItemStatus.ACQUIRED,
    );

    const acquired = TOGGLE_LOOKS[PlanItemStatus.ACQUIRED].className;
    expect(
      screen.getByRole("button", {
        name: "Mark acquired: 1 tsp sugar (counts as acquired)",
      }),
    ).toHaveClass(acquired);
    expect(screen.getByText("Spag sauce")).toHaveClass(acquired);
    expect(screen.getByText("/ Dinner", { exact: false })).not.toHaveClass(
      acquired,
    );
  });

  it("marks an item calling for none of something", () => {
    renderRow({
      ...SUGAR,
      quantity: { ...SUGAR.quantity!, quantity: 0 },
    });

    expect(screen.getByText("NO")).toBeVisible();
  });

  it("marks nothing when an item gives no quantity", () => {
    renderRow({ ...SUGAR, quantity: null });

    expect(screen.queryByText("NO")).toBeNull();
  });
});
