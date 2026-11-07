import { PlanItemStatus } from "@/__generated__/graphql";
import { publishView } from "@/features/page-engine/overlay";
import { buildView } from "@/features/page-engine/view";
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

function seedPie(data: PlanItemFragment = PUMPKIN_PIE) {
  const cache = buildInMemoryCache();
  const pie = seedFragment(cache, PlanItemFragmentDoc, "planItem", data);
  return { cache, pie };
}

describe("PlanItem", () => {
  it("shows a blank name as Unnamed, set apart from real names", () => {
    const { cache, pie } = seedPie({ ...PUMPKIN_PIE, name: " " });

    render(<PlanItem item={pie} />, { cache });

    expect(screen.getByText("Unnamed")).toHaveClass("italic");
  });

  it("shows a name being saved in place of the one it replaces", () => {
    const { cache, pie } = seedPie();
    publishView(
      cache,
      buildView([
        {
          key: "k1",
          seq: 1,
          phase: "ready",
          kept: "kept",
          change: { kind: "rename", id: "42", planId: "7", name: "Apple pie" },
        },
      ]),
    );

    render(<PlanItem item={pie} />, { cache });

    expect(screen.getByText("Apple pie")).toBeVisible();
    expect(screen.queryByText("Pumpkin pie")).toBeNull();
  });

  it("shows the item's name", () => {
    const { cache, pie } = seedPie();

    render(<PlanItem item={pie} />, { cache });

    expect(screen.getByText("Pumpkin pie")).toBeVisible();
  });

  it("offers nothing to click when choosing it does nothing", () => {
    const { cache, pie } = seedPie();

    render(<PlanItem item={pie} />, { cache });

    expect(screen.getByText("Pumpkin pie")).toBeVisible();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("reports its own id when chosen", async () => {
    const { cache, pie } = seedPie();
    const onSelect = vi.fn();

    render(<PlanItem item={pie} onSelect={onSelect} />, { cache });
    await userEvent.click(screen.getByRole("button", { name: "Pumpkin pie" }));

    expect(onSelect).toHaveBeenCalledWith("42");
  });
});
