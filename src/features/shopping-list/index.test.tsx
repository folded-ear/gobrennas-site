import { PlanItemStatus } from "@/__generated__/graphql";
import {
  changeApiClient,
  ChangeRequest,
} from "@/features/plan-changes/test/change-api";
import { PlanDirectoryProvider } from "@/features/plan-directory";
import { buildPlanTree } from "@/features/plan-dnd/moves";
import {
  buildInMemoryCache,
  render,
  screen,
  userEvent,
  waitFor,
  within,
} from "@/test";
import { ApolloProvider } from "@apollo/client/react";
import { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { BASIL, plan, seedItem, SUGAR } from "./fixtures";
import { ShoppingRegions } from "./index";
import { buildShoppingList, ShoppingList } from "./model";

const WEEKNIGHTS = {
  id: "7",
  name: "Weeknights",
  color: "#F57F17",
  changeable: true,
};

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

    expect(screen.getByRole("heading", { name: "Acquired" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Needed" })).toBeNull();
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
    const basil = screen.getByRole("button", { name: /^basil/ });
    const sugar = screen.getByRole("button", { name: /^sugar/ });

    await userEvent.click(basil);
    await userEvent.click(sugar);

    expect(basil).toHaveAttribute("aria-expanded", "false");
    expect(sugar).toHaveAttribute("aria-expanded", "true");

    await userEvent.click(sugar);

    expect(sugar).toHaveAttribute("aria-expanded", "false");
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
              pantry: SUGAR,
            }),
            seedItem(cache, {
              id: "b",
              name: "2 Tbsp sugar",
              parent: "t",
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
    const requests: ChangeRequest[] = [];
    const client = changeApiClient(cache, requests);
    const wrap = (list: ShoppingList): ReactElement => (
      <ApolloProvider client={client}>
        <PlanDirectoryProvider
          directory={{
            plans: [WEEKNIGHTS],
            planOfItem: new Map(),
            planOfBucket: new Map(),
          }}
        >
          <ShoppingRegions list={list} tree={TREE} />
        </PlanDirectoryProvider>
      </ApolloProvider>
    );
    const { rerender } = render(wrap(weeknights(cache)), { cache });
    return {
      requests,
      without: () => rerender(wrap(weeknights(cache, { withSugar: false }))),
    };
  }

  function sent(requests: readonly ChangeRequest[]) {
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
