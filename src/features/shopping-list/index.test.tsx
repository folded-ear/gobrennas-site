import { PlanItemStatus } from "@/__generated__/graphql";
import { PlanDirectoryProvider } from "@/features/plan-directory";
import { buildInMemoryCache, render, screen, within } from "@/test";
import { describe, expect, it } from "vitest";
import { BASIL, plan, seedItem, SUGAR } from "./fixtures";
import { ShoppingRegions } from "./index";
import { buildShoppingList, ShoppingList } from "./model";

const WEEKNIGHTS = { id: "7", name: "Weeknights", color: "#F57F17" };

function renderList(list: ShoppingList, cache = buildInMemoryCache()) {
  render(
    <PlanDirectoryProvider
      directory={{
        plans: [WEEKNIGHTS],
        planOfItem: new Map(),
        planOfBucket: new Map(),
      }}
    >
      <ShoppingRegions list={list} />
    </PlanDirectoryProvider>,
    { cache },
  );
}

describe("ShoppingRegions", () => {
  it("lists what's needed, then what's acquired, each with its loose items last", () => {
    const cache = buildInMemoryCache();
    const list = buildShoppingList([
      plan(
        WEEKNIGHTS.id,
        WEEKNIGHTS.name,
        WEEKNIGHTS.color,
        ["a", "b", "c", "d"],
        [
          seedItem(cache, {
            id: "a",
            name: "paper towels",
            parent: "7",
          }),
          seedItem(cache, {
            id: "b",
            name: "basil",
            parent: "7",
            pantry: BASIL,
          }),
          seedItem(cache, {
            id: "c",
            name: "foil",
            parent: "7",
            status: PlanItemStatus.ACQUIRED,
          }),
          seedItem(cache, {
            id: "d",
            name: "sugar",
            parent: "7",
            pantry: SUGAR,
            status: PlanItemStatus.ACQUIRED,
          }),
        ],
      ),
    ]);

    renderList(list, cache);

    const needed = screen.getByRole("region", { name: "Needed" });
    const acquired = screen.getByRole("region", { name: "Acquired" });
    const [basil, towels] = within(needed).getAllByRole("listitem");
    expect(within(basil).getByRole("button", { name: /basil/ })).toBeVisible();
    expect(towels).toHaveTextContent("paper towels");
    const [sugar, foil] = within(acquired).getAllByRole("listitem");
    expect(within(sugar).getByRole("button", { name: /sugar/ })).toBeVisible();
    expect(foil).toHaveTextContent("foil");
    expect(
      needed.compareDocumentPosition(acquired) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("leaves out a region with nothing in it", () => {
    const cache = buildInMemoryCache();
    const list = buildShoppingList([
      plan(
        WEEKNIGHTS.id,
        WEEKNIGHTS.name,
        WEEKNIGHTS.color,
        ["b"],
        [
          seedItem(cache, {
            id: "b",
            name: "basil",
            parent: "7",
            pantry: BASIL,
          }),
        ],
      ),
    ]);

    renderList(list, cache);

    expect(screen.getByRole("region", { name: "Needed" })).toBeVisible();
    expect(screen.queryByRole("region", { name: "Acquired" })).toBeNull();
  });

  it("says so when there's nothing to shop for", () => {
    renderList(buildShoppingList([]));

    expect(screen.getByText("There's nothing to shop for.")).toBeVisible();
    expect(screen.queryByRole("region")).toBeNull();
  });
});
