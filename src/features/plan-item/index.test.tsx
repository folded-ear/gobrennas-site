import { PlanItemStatus } from "@/__generated__/graphql";
import {
  buildInMemoryCache,
  render,
  screen,
  seedFragment,
  userEvent,
} from "@/test";
import { describe, expect, it, vi } from "vitest";
import {
  PlanItemFragment,
  PlanItemFragmentDoc,
} from "./__generated__/planItem.generated";
import { PlanItem } from "./index";

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

function seedPie() {
  const cache = buildInMemoryCache();
  const pie = seedFragment(cache, PlanItemFragmentDoc, "planItem", PUMPKIN_PIE);
  return { cache, pie };
}

describe("PlanItem", () => {
  it("shows the item's name", () => {
    const { cache, pie } = seedPie();

    render(<PlanItem item={pie} />, { cache });

    expect(screen.getByRole("button", { name: "Pumpkin pie" })).toBeVisible();
  });

  it("reports its own id when chosen", async () => {
    const { cache, pie } = seedPie();
    const onSelect = vi.fn();

    render(<PlanItem item={pie} onSelect={onSelect} />, { cache });
    await userEvent.click(screen.getByRole("button", { name: "Pumpkin pie" }));

    expect(onSelect).toHaveBeenCalledWith("42");
  });
});
