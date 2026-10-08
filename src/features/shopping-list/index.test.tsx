import { PlanItemStatus } from "@/__generated__/graphql";
import { ApiRequest, fakeApi } from "@/features/page-engine/test/fake-api";
import { PlanDirectoryProvider } from "@/features/plan-directory";
import { buildPlanTree } from "@/features/plan-dnd/moves";
import {
  keyboardCancel,
  keyboardDrag,
  keyboardDrop,
} from "@/lib/dnd/test/keyboard-drag";
import {
  buildInMemoryCache,
  render,
  screen,
  userEvent,
  waitFor,
  within,
} from "@/test";
import { gql } from "@apollo/client";
import { ApolloProvider, useFragment } from "@apollo/client/react";
import { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { ShoppingRegions } from "./index";
import {
  buildShoppingList,
  ingredientKey,
  ShoppingList,
  ShoppingPlan,
} from "./model";
import { BASIL, plan, seedItem, SUGAR, TBSP, TSP } from "./test/fixtures";
import { useStoreMoves } from "./use-store-moves";

const WEEKNIGHTS = {
  id: "7",
  name: "Weeknights",
  color: "#F57F17",
  changeable: true,
};

function renderList(
  list: ShoppingList,
  cache = buildInMemoryCache(),
  onAcquiredToggle?: () => void,
) {
  render(
    <PlanDirectoryProvider
      directory={{
        plans: [WEEKNIGHTS],
        planOfItem: new Map(),
        planOfBucket: new Map(),
      }}
    >
      <ShoppingRegions list={list} onAcquiredToggle={onAcquiredToggle} />
    </PlanDirectoryProvider>,
    { cache },
  );
}

async function expandAcquired() {
  await userEvent.click(screen.getByRole("button", { name: /^Acquired/ }));
}

describe("ShoppingRegions", () => {
  it("lists what's needed, then what's acquired, each with its loose items last", async () => {
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
    await expandAcquired();

    const needed = screen.getByRole("region", { name: "Needed" });
    const acquired = screen.getByRole("region", { name: "Acquired (2)" });
    const [basil, towels] = within(needed).getAllByRole("listitem");
    expect(within(basil).getByRole("button", { name: /^basil/ })).toBeVisible();
    expect(towels).toHaveTextContent("paper towels");
    const [sugar, foil] = within(acquired).getAllByRole("listitem");
    expect(within(sugar).getByRole("button", { name: /^sugar/ })).toBeVisible();
    expect(foil).toHaveTextContent("foil");
    expect(
      needed.compareDocumentPosition(acquired) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("heads the acquired region, but not the needed one", () => {
    const cache = buildInMemoryCache();
    const list = buildShoppingList([
      plan(
        WEEKNIGHTS.id,
        WEEKNIGHTS.name,
        WEEKNIGHTS.color,
        ["b", "d"],
        [
          seedItem(cache, {
            id: "b",
            name: "basil",
            parent: "7",
            pantry: BASIL,
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

    expect(screen.getByRole("heading", { name: "Acquired (1)" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Needed" })).toBeNull();
  });

  it("collapses the acquired region until it's expanded", async () => {
    const cache = buildInMemoryCache();
    const list = buildShoppingList([
      plan(
        WEEKNIGHTS.id,
        WEEKNIGHTS.name,
        WEEKNIGHTS.color,
        ["d"],
        [
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
    const toggle = screen.getByRole("button", { name: "Acquired (1)" });

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: /^sugar/ })).toBeNull();

    await userEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /^sugar/ })).toBeVisible();

    await userEvent.click(toggle);

    expect(screen.queryByRole("button", { name: /^sugar/ })).toBeNull();
  });

  it("tells when the acquired region opens or closes", async () => {
    const cache = buildInMemoryCache();
    const list = buildShoppingList([
      plan(
        WEEKNIGHTS.id,
        WEEKNIGHTS.name,
        WEEKNIGHTS.color,
        ["d"],
        [
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
    const onAcquiredToggle = vi.fn();
    renderList(list, cache, onAcquiredToggle);

    await expandAcquired();
    await expandAcquired();

    expect(onAcquiredToggle).toHaveBeenCalledTimes(2);
  });

  it("expands one shopping item at a time", async () => {
    const cache = buildInMemoryCache();
    const list = buildShoppingList([
      plan(
        WEEKNIGHTS.id,
        WEEKNIGHTS.name,
        WEEKNIGHTS.color,
        ["b", "d"],
        [
          seedItem(cache, {
            id: "b",
            name: "basil",
            parent: "7",
            pantry: BASIL,
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
    await expandAcquired();
    const basil = screen.getByRole("button", { name: /^basil/ });
    const sugar = screen.getByRole("button", { name: /^sugar/ });

    await userEvent.click(basil);
    await userEvent.click(sugar);

    expect(basil).toHaveAttribute("aria-expanded", "false");
    expect(sugar).toHaveAttribute("aria-expanded", "true");

    await userEvent.click(sugar);

    expect(sugar).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps the acquired region open as a shopping item expands", async () => {
    const cache = buildInMemoryCache();
    const list = buildShoppingList([
      plan(
        WEEKNIGHTS.id,
        WEEKNIGHTS.name,
        WEEKNIGHTS.color,
        ["b", "d"],
        [
          seedItem(cache, {
            id: "b",
            name: "basil",
            parent: "7",
            pantry: BASIL,
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
    await expandAcquired();
    const toggle = screen.getByRole("button", { name: "Acquired (1)" });

    await userEvent.click(screen.getByRole("button", { name: /^sugar/ }));

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /^sugar/ })).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: /^basil/ }));

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /^sugar/ })).toBeVisible();
  });

  it("shows each shopping item's own status, whichever region it's in", async () => {
    const cache = buildInMemoryCache();
    const list = buildShoppingList(
      [
        plan(
          WEEKNIGHTS.id,
          WEEKNIGHTS.name,
          WEEKNIGHTS.color,
          ["b", "d"],
          [
            seedItem(cache, {
              id: "b",
              name: "basil",
              parent: "7",
              pantry: BASIL,
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
      ],
      new Set([ingredientKey(BASIL.id), ingredientKey(SUGAR.id)]),
    );

    renderList(list, cache);
    await expandAcquired();

    const needed = screen.getByRole("region", { name: "Needed" });
    expect(
      within(needed).getByRole("button", { name: "Mark needed: sugar" }),
    ).toBeVisible();
    const acquired = screen.getByRole("region", { name: "Acquired (1)" });
    expect(
      within(acquired).getByRole("button", { name: "Mark acquired: basil" }),
    ).toBeVisible();
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

describe("ShoppingRegions, editing", () => {
  type Cache = ReturnType<typeof buildInMemoryCache>;

  /** Weeknights: sugar for a sauce (s) and a tea (t), and paper towels. */
  function weeknights(cache: Cache, { withSugar = true } = {}) {
    const items = [
      seedItem(cache, {
        id: "s",
        name: "Spag sauce",
        parent: "7",
        children: ["a"],
      }),
      seedItem(cache, {
        id: "t",
        name: "Iced tea",
        parent: "7",
        children: ["b"],
      }),
      seedItem(cache, { id: "c", name: "paper towels", parent: "7" }),
      ...(withSugar
        ? [
            seedItem(cache, {
              id: "a",
              name: "1 tsp sugar",
              parent: "s",
              quantity: 1,
              unit: TSP,
              pantry: SUGAR,
            }),
            seedItem(cache, {
              id: "b",
              name: "2 Tbsp sugar",
              parent: "t",
              quantity: 2,
              unit: TBSP,
              pantry: SUGAR,
            }),
          ]
        : []),
    ];
    return buildShoppingList([
      plan(
        WEEKNIGHTS.id,
        WEEKNIGHTS.name,
        WEEKNIGHTS.color,
        ["s", "t", "c"],
        items,
      ),
    ]);
  }

  const TREE = buildPlanTree([
    { id: "7", children: [{ id: "s" }, { id: "t" }, { id: "c" }] },
    { id: "s", children: [{ id: "a" }] },
    { id: "t", children: [{ id: "b" }] },
    { id: "a", children: [] },
    { id: "b", children: [] },
    { id: "c", children: [] },
  ]);

  function renderEditable() {
    const cache = buildInMemoryCache();
    const { client, requests } = fakeApi(cache);
    const wrap = (list: ShoppingList): ReactElement => (
      <PlanDirectoryProvider
        directory={{
          plans: [WEEKNIGHTS],
          planOfItem: new Map(),
          planOfBucket: new Map(),
        }}
      >
        <ShoppingRegions list={list} tree={TREE} />
      </PlanDirectoryProvider>
    );
    const { rerender } = render(wrap(weeknights(cache)), { client });
    return {
      requests,
      without: () => rerender(wrap(weeknights(cache, { withSugar: false }))),
    };
  }

  function sent(requests: readonly ApiRequest[]) {
    return requests.map((it) => it.variables);
  }

  async function expandSugar() {
    await userEvent.click(screen.getByRole("button", { name: /^sugar/ }));
  }

  it("edits a plan item under an expanded shopping item", async () => {
    const { requests } = renderEditable();
    await expandSugar();
    await userEvent.click(screen.getByRole("button", { name: "1 tsp sugar" }));

    await userEvent.clear(screen.getByRole("textbox"));
    await userEvent.type(screen.getByRole("textbox"), "2 tsp sugar");
    await userEvent.tab();

    await waitFor(() =>
      expect(sent(requests)).toEqual([{ id0: "a", name0: "2 tsp sugar" }]),
    );
  });

  it("edits a loose plan item", async () => {
    const { requests } = renderEditable();
    await userEvent.click(screen.getByRole("button", { name: "paper towels" }));

    await userEvent.type(screen.getByRole("textbox"), ", big");
    await userEvent.tab();

    await waitFor(() =>
      expect(sent(requests)).toEqual([
        { id0: "c", name0: "paper towels, big" },
      ]),
    );
  });

  it("leaves a plan item's ancestry out of what starts editing", async () => {
    renderEditable();
    await expandSugar();

    await userEvent.click(screen.getByText("Spag sauce"));

    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("never edits a shopping item itself", async () => {
    renderEditable();

    await expandSugar();

    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("ends an edit when its shopping item collapses, and doesn't resume it", async () => {
    renderEditable();
    await expandSugar();
    await userEvent.click(screen.getByRole("button", { name: "1 tsp sugar" }));

    await expandSugar();
    await expandSugar();

    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("keeps a second new item in place as the first is created and leaves", async () => {
    const { requests } = renderEditable();
    await expandSugar();
    await userEvent.click(screen.getByRole("button", { name: "1 tsp sugar" }));
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("2 eggs");

    await userEvent.keyboard("{Enter}");

    await waitFor(() => expect(requests).toHaveLength(1));
    await waitFor(() => expect(screen.queryByText("2 eggs")).toBeNull());
    const field = screen.getByRole("textbox", { name: "New item" });
    expect(field).toHaveFocus();
    const rows = within(
      screen.getByRole("button", { name: "1 tsp sugar" }).closest("ul")!,
    ).getAllByRole("listitem");
    expect(rows[1]).toContainElement(field);
  });

  it("drops a new item whose shopping item vanishes to the loose items, still editing", async () => {
    const { without } = renderEditable();
    await expandSugar();
    await userEvent.click(screen.getByRole("button", { name: "1 tsp sugar" }));
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("2 eg");

    without();

    const field = screen.getByRole("textbox", { name: "New item" });
    expect(field).toHaveFocus();
    expect(field).toHaveValue("2 eg");
    const loose = within(screen.getByRole("region", { name: "Needed" }))
      .getAllByRole("listitem")
      .at(-1);
    expect(loose).toContainElement(field);
  });
});

describe("ShoppingRegions' store order", () => {
  const CUMIN = { id: "p6", name: "cumin", storeOrder: 0 };
  const FLOUR = { id: "p4", name: "flour", storeOrder: 20 };
  const EGGS = { id: "p5", name: "eggs", storeOrder: 25 };
  const PANTRY = [SUGAR, CUMIN, FLOUR, BASIL, EGGS];

  const STORE_ORDER = gql`
    fragment ShoppingTestStoreOrder on PantryItem {
      id
      storeOrder
    }
  `;

  /** I list the plan as the cache now orders its pantry items. */
  function Live({ plans }: { plans: readonly ShoppingPlan[] }) {
    const { data } = useFragment({
      fragment: STORE_ORDER,
      from: PANTRY.map((it) => ({ __typename: "PantryItem", id: it.id })),
    });
    const orders = new Map(
      (data as { id?: string; storeOrder?: number }[]).map((it) => [
        it.id,
        it.storeOrder,
      ]),
    );
    const list = buildShoppingList(
      plans.map((it) => ({
        ...it,
        items: it.items.map((item) =>
          item.ingredient?.__typename === "PantryItem"
            ? {
                ...item,
                ingredient: {
                  ...item.ingredient,
                  storeOrder:
                    orders.get(item.ingredient.id) ??
                    item.ingredient.storeOrder,
                },
              }
            : item,
        ),
      })),
    );
    const storeMoves = useStoreMoves(list);
    return (
      <PlanDirectoryProvider
        directory={{
          plans: [WEEKNIGHTS],
          planOfItem: new Map(),
          planOfBucket: new Map(),
        }}
      >
        <ShoppingRegions list={list} storeMoves={storeMoves} />
      </PlanDirectoryProvider>
    );
  }

  function renderOrdered() {
    const cache = buildInMemoryCache();
    for (const pantry of PANTRY) {
      cache.writeFragment({
        fragment: STORE_ORDER,
        data: { __typename: "PantryItem", ...pantry },
      });
    }
    const api = fakeApi(cache);
    const leaf = (id: string, pantry?: (typeof PANTRY)[number]) =>
      seedItem(cache, {
        id,
        name: pantry?.name ?? "paper towels",
        parent: "7",
        pantry,
      });
    const items = [
      leaf("a", SUGAR),
      leaf("b", CUMIN),
      leaf("c", FLOUR),
      leaf("d", BASIL),
      seedItem(cache, {
        id: "e",
        name: "eggs",
        parent: "7",
        status: PlanItemStatus.ACQUIRED,
        pantry: EGGS,
      }),
      leaf("f"),
    ];
    const plans = [
      plan(
        WEEKNIGHTS.id,
        WEEKNIGHTS.name,
        WEEKNIGHTS.color,
        items.map((it) => it.id),
        items,
      ),
    ];
    render(<Live plans={plans} />, { client: api.client });
    return api;
  }

  const NAMES = ["sugar", "cumin", "flour", "basil", "eggs", "paper towels"];

  function shownIn(region: string): string[] {
    return within(screen.getByRole("region", { name: region }))
      .getAllByRole("listitem")
      .map((it) => NAMES.find((name) => it.textContent?.includes(name))!);
  }

  it("asks where an ingredient with no store order should go", () => {
    renderOrdered();

    const asks = screen.getAllByRole("img", { name: "Where should this go?" });

    expect(asks).toHaveLength(1);
    expect(asks[0].closest("li")).toHaveTextContent("cumin");
  });

  it("gives each shopping item a handle, and loose items none", () => {
    renderOrdered();

    expect(
      screen
        .getAllByRole("button", { name: /^Move / })
        .map((it) => it.getAttribute("aria-label")),
    ).toEqual(["Move cumin", "Move sugar", "Move flour", "Move basil"]);
  });

  it("moves an ingredient by keyboard, at once, and saves it", async () => {
    const api = renderOrdered();

    await keyboardDrag("Move basil");
    await keyboardDrop("Put before sugar");

    expect(shownIn("Needed")).toEqual([
      "cumin",
      "basil",
      "sugar",
      "flour",
      "paper towels",
    ]);
    await waitFor(() =>
      expect(api.requests.map((it) => it.variables)).toEqual([
        { id0: BASIL.id, targetId0: SUGAR.id, after0: false },
      ]),
    );
    expect(shownIn("Needed")[1]).toBe("basil");
  });

  it("places an ingredient with no store order once it's moved", async () => {
    renderOrdered();

    await keyboardDrag("Move cumin");
    await keyboardDrop("Put after flour");

    expect(shownIn("Needed")).toEqual([
      "sugar",
      "flour",
      "cumin",
      "basil",
      "paper towels",
    ]);
    expect(
      screen.queryByRole("img", { name: "Where should this go?" }),
    ).toBeNull();
  });

  it("offers places only in the dragged item's own region", async () => {
    renderOrdered();
    await expandAcquired();

    await keyboardDrag("Move basil");

    expect(
      screen.getByRole("button", { name: "Put before sugar" }),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Put .* eggs$/ })).toBeNull();
    await keyboardCancel();
  });

  it("offers no place that would change nothing", async () => {
    renderOrdered();

    await keyboardDrag("Move flour");

    expect(
      screen.getByRole("button", { name: "Put before sugar" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Put after sugar" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Put before basil" }),
    ).toBeNull();
    await keyboardCancel();
  });

  it("puts it back and says so when the save is refused", async () => {
    const api = renderOrdered();
    api.mode = "refuse";

    await keyboardDrag("Move basil");
    await keyboardDrop("Put before sugar");

    expect(await screen.findByText("Couldn't move basil")).toBeTruthy();
    expect(shownIn("Needed")).toEqual([
      "cumin",
      "sugar",
      "flour",
      "basil",
      "paper towels",
    ]);
  });
});
