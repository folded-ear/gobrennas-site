import { PlanItemStatus } from "@/__generated__/graphql";
import {
  DirectoryPlan,
  PlanDirectory,
  PlanDirectoryProvider,
} from "@/features/plan-directory";
import { buildInMemoryCache, render, screen, userEvent, within } from "@/test";
import { describe, expect, it } from "vitest";
import { BASIL, plan, seedItem, SUGAR, TBSP, TSP } from "./fixtures";
import { buildShoppingList, ShoppingItem } from "./model";
import { ShoppingItemRow } from "./shopping-item";

const WEEKNIGHTS: DirectoryPlan = {
  id: "7",
  name: "Weeknights",
  color: "#F57F17",
};
const PARTY: DirectoryPlan = { id: "9", name: "Party", color: "#1E88E5" };

function directoryOf(plans: readonly DirectoryPlan[]): PlanDirectory {
  return { plans, planOfItem: new Map(), planOfBucket: new Map() };
}

type Cache = ReturnType<typeof buildInMemoryCache>;

/** Sugar for spaghetti sauce on weeknights, and for iced tea at the party. */
function sugar(cache: Cache): ShoppingItem {
  const list = buildShoppingList([
    plan(
      WEEKNIGHTS.id,
      WEEKNIGHTS.name,
      WEEKNIGHTS.color,
      ["sauce"],
      [
        seedItem(cache, {
          id: "sauce",
          name: "Spag sauce",
          parent: "7",
          children: ["s1"],
        }),
        seedItem(cache, {
          id: "s1",
          name: "1 tsp sugar",
          parent: "sauce",
          quantity: 1,
          unit: TSP,
          pantry: SUGAR,
        }),
      ],
    ),
    plan(
      PARTY.id,
      PARTY.name,
      PARTY.color,
      ["tea"],
      [
        seedItem(cache, {
          id: "tea",
          name: "Iced tea",
          parent: "9",
          children: ["t1"],
        }),
        seedItem(cache, {
          id: "t1",
          name: "2 T sugar",
          parent: "tea",
          quantity: 2,
          unit: TBSP,
          pantry: SUGAR,
          status: PlanItemStatus.ACQUIRED,
        }),
      ],
    ),
  ]);
  return list.needed.items[0];
}

function basil(cache: Cache): ShoppingItem {
  const list = buildShoppingList([
    plan(
      WEEKNIGHTS.id,
      WEEKNIGHTS.name,
      WEEKNIGHTS.color,
      ["b1"],
      [
        seedItem(cache, {
          id: "b1",
          name: "basil",
          parent: "7",
          pantry: BASIL,
        }),
      ],
    ),
  ]);
  return list.needed.items[0];
}

function renderRow(
  cache: Cache,
  item: ShoppingItem,
  plans: readonly DirectoryPlan[],
) {
  render(
    <PlanDirectoryProvider directory={directoryOf(plans)}>
      <ShoppingItemRow item={item} />
    </PlanDirectoryProvider>,
    { cache },
  );
}

describe("ShoppingItemRow", () => {
  it("shows its ingredient and how much is still needed", () => {
    const cache = buildInMemoryCache();
    renderRow(cache, sugar(cache), [WEEKNIGHTS, PARTY]);

    const trigger = screen.getByRole("button", { name: /sugar/ });
    expect(within(trigger).getByText("sugar")).toBeVisible();
    expect(within(trigger).getByText("1 tsp")).toBeVisible();
    expect(within(trigger).queryByText(/Tbsp/)).toBeNull();
  });

  it("shows no quantity for one plan item that gives none", () => {
    const cache = buildInMemoryCache();
    renderRow(cache, basil(cache), [WEEKNIGHTS]);

    const trigger = screen.getByRole("button", { name: /basil/ });
    expect(trigger).toHaveTextContent(/^basil$/);
  });

  it("hides its plan items until expanded, then shows every one", async () => {
    const cache = buildInMemoryCache();
    renderRow(cache, sugar(cache), [WEEKNIGHTS, PARTY]);

    expect(screen.queryByText("1 tsp sugar")).not.toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: /sugar/ }));

    expect(screen.getByText("1 tsp sugar")).toBeVisible();
    expect(screen.getByText("2 T sugar")).toBeVisible();
    expect(screen.getByText("Spag sauce / Weeknights")).toBeVisible();
    expect(screen.getByText("Iced tea / Party")).toBeVisible();
  });

  it("carries a dot for every plan behind it when several are shopped", () => {
    const cache = buildInMemoryCache();
    renderRow(cache, sugar(cache), [WEEKNIGHTS, PARTY]);

    const dots = screen.getByRole("group", { name: "Plans" });
    expect(within(dots).getByRole("img", { name: "Weeknights" })).toBeVisible();
    expect(within(dots).getByRole("img", { name: "Party" })).toBeVisible();
  });

  it("carries no dots when one plan is shopped", () => {
    const cache = buildInMemoryCache();
    renderRow(cache, basil(cache), [WEEKNIGHTS]);

    expect(screen.queryByRole("group", { name: "Plans" })).toBeNull();
  });
});
