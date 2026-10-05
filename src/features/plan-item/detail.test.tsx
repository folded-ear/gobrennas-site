import { PlanItemStatus } from "@/__generated__/graphql";
import {
  ApiRequest,
  fakeApi,
  FIRST_CREATED_ID,
} from "@/features/page-engine/test/fake-api";
import { markPending } from "@/features/page-engine/test/status-cache";
import {
  buildPlanDirectory,
  PlanDirectoryProvider,
} from "@/features/plan-directory";
import { PlanDnd } from "@/features/plan-dnd";
import { buildPlanTree } from "@/features/plan-dnd/moves";
import {
  dropZoneLabel,
  getDropZone,
  keyboardCancel,
  keyboardDrag,
  keyboardDrop,
  queryAllDropZones,
  queryDropZone,
} from "@/features/plan-dnd/test/dnd-harness";
import { PlanMoves } from "@/features/plan-dnd/use-plan-moves";
import {
  buildEntries,
  EditSurfaceProvider,
  treeOrder,
  useEditState,
} from "@/features/plan-edit";
import {
  buildPlanContext,
  PlanContext,
} from "@/features/plan-timeline/context";
import { PlanItemNode, TimelineItem } from "@/features/plan-timeline/model";
import {
  buildInMemoryCache,
  render,
  screen,
  seedFragment,
  userEvent,
  waitFor,
} from "@/test";
import { FragmentType } from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { describe, expect, it, vi } from "vitest";
import {
  PlanItemFragment,
  PlanItemFragmentDoc,
} from "./__generated__/planItem.generated";
import { PlanItemDetail, PlanItemHeader } from "./detail";

const PIE = { id: "42", name: "Pumpkin pie" };
const CRUST = { id: "43", name: "Pie crust" };
const FILLING = { id: "44", name: "Pie filling" };

type Spec = { readonly id: string; readonly name: string };

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

function timelineItem(
  { id, name }: Spec,
  childIds: readonly string[] = [],
  bucketId: string | null = null,
): TimelineItem {
  return {
    __typename: "PlanItem",
    id,
    name,
    bucket: bucketId ? { __typename: "PlanBucket", id: bucketId } : null,
    children: childIds.map((c) => ({ __typename: "PlanItem", id: c })),
  };
}

function node({ id, name }: Spec): PlanItemNode {
  return { item: timelineItem({ id, name }), children: [] };
}

// Plan 7: Pumpkin pie (42), holding Pie crust (43) then Pie filling (44).
function planContext(): PlanContext {
  return buildPlanContext({
    plans: [
      {
        rootIds: [PIE.id],
        items: [
          timelineItem(PIE, [CRUST.id, FILLING.id]),
          timelineItem(CRUST),
          timelineItem(FILLING),
        ],
        buckets: [],
      },
    ],
  });
}

const SATURDAY = "2026-09-12";
const SUNDAY = "2026-09-13";

/** The same plan, with the crust made the day after the pie it goes in. */
function movedContext(): PlanContext {
  return buildPlanContext({
    plans: [
      {
        rootIds: [PIE.id],
        items: [
          timelineItem(PIE, [CRUST.id, FILLING.id], "sat"),
          timelineItem(CRUST, [], "sun"),
          timelineItem(FILLING),
        ],
        buckets: [
          { id: "sat", date: SATURDAY, name: null },
          { id: "sun", date: SUNDAY, name: null },
        ],
      },
    ],
  });
}

type DetailProps = {
  item: FragmentType<PlanItemFragment>;
  context: PlanContext;
  descendants: readonly PlanItemNode[];
  onSelect?: (id: string) => void;
  dnd?: PlanDnd;
};

/** I put an item's screen together the way the planner does. */
function Detail({ item, context, descendants, onSelect, dnd }: DetailProps) {
  return (
    <>
      <PlanItemHeader
        item={item}
        context={context}
        hasDescendants={descendants.length > 0}
        onSelect={onSelect}
      />
      <PlanItemDetail context={context} descendants={descendants} dnd={dnd} />
    </>
  );
}

function renderDetail(
  notes: string | null,
  descendants: readonly PlanItemNode[],
  onSelect?: (id: string) => void,
) {
  const cache = buildInMemoryCache();
  const pie = seedFragment(
    cache,
    PlanItemFragmentDoc,
    "planItem",
    fragment(PIE, notes),
  );
  seedFragment(cache, PlanItemFragmentDoc, "planItem", fragment(CRUST, null));
  return render(
    <Detail
      item={pie}
      context={planContext()}
      descendants={descendants}
      onSelect={onSelect}
    />,
    { cache },
  );
}

/** The crust sits under the pie, so it has somewhere to walk back up to. */
function renderCrustOpen(onSelect?: (id: string) => void) {
  const cache = buildInMemoryCache();
  const crust = seedFragment(
    cache,
    PlanItemFragmentDoc,
    "planItem",
    fragment(CRUST, null),
  );
  return render(
    <Detail
      item={crust}
      context={planContext()}
      descendants={[]}
      onSelect={onSelect}
    />,
    { cache },
  );
}

function renderPieInDirectory(cookedIds: readonly string[] = []) {
  const cache = buildInMemoryCache();
  const pie = seedFragment(
    cache,
    PlanItemFragmentDoc,
    "planItem",
    fragment(PIE, null),
  );
  seedFragment(cache, PlanItemFragmentDoc, "planItem", fragment(CRUST, null));
  seedFragment(cache, PlanItemFragmentDoc, "planItem", fragment(FILLING, null));
  for (const id of cookedIds) {
    markPending(cache, id, PlanItemStatus.COMPLETED);
  }
  render(
    <PlanDirectoryProvider
      directory={buildPlanDirectory([
        {
          id: "7",
          name: "Holidays",
          color: "#F57F17",
          mine: true,
          grants: [],
          descendants: [PIE, CRUST, FILLING],
          buckets: [],
        },
      ])}
    >
      <Detail
        item={pie}
        context={planContext()}
        descendants={[
          {
            item: timelineItem(CRUST, [FILLING.id]),
            children: [node(FILLING)],
          },
        ]}
      />
    </PlanDirectoryProvider>,
    { cache },
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

    expect(screen.getByText("Pie crust")).toBeVisible();
  });

  it("offers to cook the item, and whatever below it has something below it", () => {
    renderPieInDirectory();

    expect(
      screen.getByRole("link", { name: "Cook Pie crust" }),
    ).toHaveAttribute("href", "/plan/7/recipe/43");
    expect(
      screen.getByRole("link", { name: "Cook Pumpkin pie" }),
    ).toHaveAttribute("href", "/plan/7/recipe/42");
    expect(screen.queryByRole("link", { name: "Cook Pie filling" })).toBeNull();
  });

  it("offers to acquire the item, as the timeline does", () => {
    renderPieInDirectory();

    expect(
      screen.getByRole("button", { name: "Mark acquired: Pumpkin pie" }),
    ).toBeVisible();
  });

  it("offers to acquire or delete what sits below the item, but not to delete the item", () => {
    renderPieInDirectory();

    expect(
      screen.getByRole("button", { name: "Mark acquired: Pie filling" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Delete: Pie crust" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Delete: Pumpkin pie" }),
    ).toBeNull();
  });

  it("offers to undo a cooking in place of its cook link, open or below", () => {
    renderPieInDirectory([PIE.id, CRUST.id]);

    expect(
      screen.getByRole("button", {
        name: "Wait, no! Undo cooked: Pumpkin pie",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Wait, no! Undo cooked: Pie crust" }),
    ).toBeVisible();
    expect(screen.queryByRole("link", { name: /^Cook / })).toBeNull();
  });

  it("shows nothing below the item when nothing is there", () => {
    renderDetail(null, []);

    expect(screen.getByRole("heading", { name: "Pumpkin pie" })).toBeVisible();
    expect(screen.queryByText("Pie crust")).toBeNull();
  });

  it("says what the open item is part of", () => {
    renderCrustOpen();

    expect(screen.getByText("Pumpkin pie")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Pie crust" })).toBeVisible();
  });

  it("opens an ancestor of the item that is chosen", async () => {
    const onSelect = vi.fn();
    renderCrustOpen(onSelect);

    await userEvent.click(screen.getByRole("button", { name: "Pumpkin pie" }));

    expect(onSelect).toHaveBeenCalledWith("42");
  });

  it("says when something below the item has been moved off its day", () => {
    const cache = buildInMemoryCache();
    const pie = seedFragment(
      cache,
      PlanItemFragmentDoc,
      "planItem",
      fragment(PIE, null),
    );
    seedFragment(cache, PlanItemFragmentDoc, "planItem", fragment(CRUST, null));
    render(
      <Detail
        item={pie}
        context={movedContext()}
        descendants={[node(CRUST)]}
      />,
      { cache },
    );

    expect(screen.getByText("Pie crust")).toBeVisible();
    expect(screen.getByText("Sun, Sep 13")).toBeVisible();
  });

  it("leaves something sitting on its parent's day unremarked", () => {
    renderDetail(null, [node(CRUST)]);

    expect(screen.getByText("Pie crust")).toBeVisible();
    expect(screen.queryByText(/Sep/)).toBeNull();
  });

  it("leaves what sits below the item inert", async () => {
    const onSelect = vi.fn();
    renderDetail(null, [node(CRUST)], onSelect);

    expect(screen.getByText("Pie crust")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Pie crust" })).toBeNull();
  });
});

function pieTree() {
  return buildPlanTree([
    { id: "7", children: [{ id: PIE.id }] },
    { id: PIE.id, children: [{ id: CRUST.id }, { id: FILLING.id }] },
    { id: CRUST.id, children: [] },
    { id: FILLING.id, children: [] },
  ]);
}

function fakeMoves(): PlanMoves {
  return {
    moveInTree: vi.fn(),
    moveToDate: vi.fn(),
    moveToBucket: vi.fn(),
    moveToUnplanned: vi.fn(),
  };
}

function renderMovable(dnd: Partial<PlanDnd> = {}) {
  const cache = buildInMemoryCache();
  const pie = seedFragment(
    cache,
    PlanItemFragmentDoc,
    "planItem",
    fragment(PIE, null),
  );
  seedFragment(cache, PlanItemFragmentDoc, "planItem", fragment(CRUST, null));
  seedFragment(cache, PlanItemFragmentDoc, "planItem", fragment(FILLING, null));
  return render(
    <Detail
      item={pie}
      context={planContext()}
      descendants={[node(CRUST), node(FILLING)]}
      dnd={{ tree: pieTree(), canMove: () => true, moves: fakeMoves(), ...dnd }}
    />,
    { cache },
  );
}

describe("PlanItemDetail, moving items", () => {
  it("offers a handle on each descendant, but not on the item itself", () => {
    renderMovable();

    expect(
      screen.getByRole("button", { name: "Move Pie crust" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Move Pie filling" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Move Pumpkin pie" }),
    ).toBeNull();
  });

  it("offers no handles when the plan can't be changed", () => {
    renderMovable({ canMove: () => false });

    expect(screen.getByText("Pie crust")).toBeVisible();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("offers every drop that would change something, and no other", async () => {
    renderMovable();

    await keyboardDrag("Move Pie crust");

    expect(getDropZone("Nest under Pie filling")).toBeInTheDocument();
    expect(getDropZone("Put after Pie filling")).toBeInTheDocument();
    // The crust already comes right before the filling.
    expect(queryDropZone("Put before Pie filling")).toBeNull();
    expect(queryDropZone(/^(Nest under|Put \w+) Pie crust$/)).toBeNull();

    await keyboardCancel();
  });

  it("offers a row's zones in reading order", async () => {
    renderMovable();

    await keyboardDrag("Move Pie filling");

    expect(
      queryAllDropZones(/^(Nest under|Put \w+) Pie crust$/).map(dropZoneLabel),
    ).toEqual(["Put before Pie crust", "Nest under Pie crust"]);

    await keyboardCancel();
  });

  it("nests an item under the one it's dropped on", async () => {
    const moves = fakeMoves();
    renderMovable({ moves });

    await keyboardDrag("Move Pie crust");
    await keyboardDrop("Nest under Pie filling");

    expect(moves.moveInTree).toHaveBeenCalledWith(
      { ids: [CRUST.id], parentId: FILLING.id, afterId: null },
      "Pie crust",
    );
  });

  it("puts an item after the one it's dropped below", async () => {
    const moves = fakeMoves();
    renderMovable({ moves });

    await keyboardDrag("Move Pie crust");
    await keyboardDrop("Put after Pie filling");

    expect(moves.moveInTree).toHaveBeenCalledWith(
      { ids: [CRUST.id], parentId: PIE.id, afterId: FILLING.id },
      "Pie crust",
    );
  });
});

// Plan 9: Tacos (50), holding Salsa (51), sharing a section with the pie.
const TACOS = { id: "50", name: "Tacos" };
const SALSA = { id: "51", name: "Salsa" };

describe("PlanItemDetail, a section's items", () => {
  const pieNode: PlanItemNode = {
    item: timelineItem(PIE, [CRUST.id, FILLING.id]),
    children: [node(CRUST), node(FILLING)],
  };
  const tacosNode: PlanItemNode = {
    item: timelineItem(TACOS, [SALSA.id]),
    children: [node(SALSA)],
  };

  function renderSection(roots: readonly PlanItemNode[]) {
    const cache = buildInMemoryCache();
    for (const spec of [PIE, CRUST, FILLING, TACOS, SALSA]) {
      seedFragment(
        cache,
        PlanItemFragmentDoc,
        "planItem",
        fragment(spec, null),
      );
    }
    const tree = buildPlanTree([
      { id: "7", children: [{ id: PIE.id }] },
      { id: PIE.id, children: [{ id: CRUST.id }, { id: FILLING.id }] },
      { id: CRUST.id, children: [] },
      { id: FILLING.id, children: [] },
      { id: "9", children: [{ id: TACOS.id }] },
      { id: TACOS.id, children: [{ id: SALSA.id }] },
      { id: SALSA.id, children: [] },
    ]);
    const directory = buildPlanDirectory([
      {
        id: "7",
        name: "Holidays",
        color: "#F57F17",
        mine: true,
        grants: [],
        descendants: [PIE, CRUST, FILLING],
        buckets: [],
      },
      {
        id: "9",
        name: "Weeknights",
        color: "#1E88E5",
        mine: true,
        grants: [],
        descendants: [TACOS, SALSA],
        buckets: [],
      },
    ]);
    return render(
      <PlanDirectoryProvider directory={directory}>
        <PlanItemDetail
          context={new Map()}
          descendants={roots}
          holdsSection
          dnd={{ tree, canMove: () => true, moves: fakeMoves() }}
        />
      </PlanDirectoryProvider>,
      { cache },
    );
  }

  it("holds a single plan's section items still, their handles disabled", () => {
    renderSection([pieNode]);

    expect(
      screen.getByRole("button", { name: "Move Pumpkin pie" }),
    ).toHaveAttribute("aria-disabled", "true");
    expect(
      screen.getByRole("button", { name: "Move Pie crust" }),
    ).not.toHaveAttribute("aria-disabled");
  });

  it("marks several plans' section items with their plan, not a handle", () => {
    renderSection([pieNode, tacosNode]);

    expect(
      screen.queryByRole("button", { name: /^Move (Pumpkin pie|Tacos)$/ }),
    ).toBeNull();
    expect(screen.getByRole("img", { name: "Holidays" })).toBeVisible();
    expect(screen.getByRole("img", { name: "Weeknights" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Move Salsa" })).toBeVisible();
  });

  it("offers a section's own items only to nest under", async () => {
    renderSection([pieNode]);

    await keyboardDrag("Move Pie filling");

    expect(getDropZone("Nest under Pumpkin pie")).toBeInTheDocument();
    expect(queryDropZone(/^Put \w+ Pumpkin pie$/)).toBeNull();
    expect(getDropZone("Put before Pie crust")).toBeInTheDocument();

    await keyboardCancel();
  });

  it("offers nowhere in another plan to drop an item", async () => {
    renderSection([pieNode, tacosNode]);

    await keyboardDrag("Move Pie filling");

    expect(
      queryAllDropZones(/^(Nest under|Put \w+) (Tacos|Salsa)$/),
    ).toHaveLength(0);
    expect(getDropZone("Nest under Pie crust")).toBeInTheDocument();

    await keyboardCancel();
  });
});

describe("PlanItemDetail, editing", () => {
  const HOLIDAYS = {
    id: "7",
    name: "Holidays",
    color: "#F57F17",
    mine: true,
    grants: [],
    descendants: [PIE, CRUST, FILLING],
    buckets: [],
  };
  const pieNode: PlanItemNode = {
    item: timelineItem(PIE, [CRUST.id, FILLING.id], "sat"),
    children: [node(CRUST), node(FILLING)],
  };

  type EditableProps = {
    readonly open: PlanItemNode | null;
    readonly roots: readonly PlanItemNode[];
    readonly onRemoved: () => void;
  };

  /** I edit an item's or a section's screen the way the planner does. */
  function Editable({ open, roots, onRemoved }: EditableProps) {
    const state = useEditState();
    const openId = open?.item.id ?? null;
    const entries = buildEntries(roots, state.drafts, openId);
    const tree = pieTree();
    return (
      <EditSurfaceProvider
        state={state}
        order={treeOrder(entries, openId === null ? null : { id: openId })}
        tree={tree}
        createdStayPut
      >
        {open ? (
          <PlanItemHeader
            item={`PlanItem:${open.item.id}` as never}
            context={planContext()}
            hasDescendants={roots.length > 0}
            onRemoved={onRemoved}
          />
        ) : null}
        <PlanItemDetail
          context={planContext()}
          descendants={roots}
          parentId={openId ?? undefined}
          holdsSection={open === null}
        />
        <button type="button">Elsewhere</button>
      </EditSurfaceProvider>
    );
  }

  function renderEditable(
    open: PlanItemNode | null,
    roots: readonly PlanItemNode[],
    { pendingIds = [] as readonly string[] } = {},
  ) {
    const cache = buildInMemoryCache();
    for (const spec of [PIE, CRUST, FILLING]) {
      seedFragment(
        cache,
        PlanItemFragmentDoc,
        "planItem",
        fragment(spec, null),
      );
    }
    for (const id of pendingIds) {
      markPending(cache, id, PlanItemStatus.DELETED);
    }
    const { client, requests } = fakeApi(cache);
    const onRemoved = vi.fn();
    render(
      <PlanDirectoryProvider directory={buildPlanDirectory([HOLIDAYS])}>
        <Editable open={open} roots={roots} onRemoved={onRemoved} />
      </PlanDirectoryProvider>,
      { client },
    );
    return { requests, onRemoved };
  }

  function sent(requests: readonly ApiRequest[]) {
    return requests.map((it) => it.variables);
  }

  async function leave() {
    await userEvent.click(screen.getByRole("button", { name: "Elsewhere" }));
  }

  it("renames what sits below the item once focus leaves", async () => {
    const { requests } = renderEditable(pieNode, pieNode.children);
    await userEvent.click(screen.getByRole("button", { name: "Pie crust" }));

    // user-event does not yet recognize plaintext-only contenteditables.
    screen.getByRole("textbox").setAttribute("contenteditable", "true");
    await userEvent.clear(screen.getByRole("textbox"));
    await userEvent.type(screen.getByRole("textbox"), "Tart crust");
    await leave();

    await waitFor(() =>
      expect(sent(requests)).toEqual([{ id0: CRUST.id, name0: "Tart crust" }]),
    );
  });

  it("adds a first child on Enter in the heading", async () => {
    const { requests } = renderEditable(pieNode, pieNode.children);
    await userEvent.click(screen.getByRole("button", { name: "Pumpkin pie" }));

    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("textbox", { name: "New item" })).toHaveFocus();
    await userEvent.keyboard("Apples");
    await leave();

    await waitFor(() =>
      expect(sent(requests)).toEqual([
        { parentId0: PIE.id, afterId0: null, name0: "Apples" },
      ]),
    );
  });

  it("goes up to the heading on Backspace in the first row", async () => {
    const { requests } = renderEditable(pieNode, pieNode.children);
    await userEvent.click(screen.getByRole("button", { name: "Pie crust" }));
    screen.getByRole("textbox").setAttribute("contenteditable", "true");
    await userEvent.clear(screen.getByRole("textbox"));

    await userEvent.keyboard("{Backspace}");

    expect(screen.getByRole("textbox")).toHaveValue("Pumpkin pie");
    await waitFor(() =>
      expect(sent(requests)).toEqual([
        { id0: CRUST.id, status0: PlanItemStatus.DELETED, doneAt0: null },
      ]),
    );
  });

  it("deletes an emptied open item with nothing below it, closing its screen", async () => {
    const { requests, onRemoved } = renderEditable(node(CRUST), []);
    await userEvent.click(screen.getByRole("button", { name: "Pie crust" }));
    await userEvent.clear(screen.getByRole("textbox"));

    await userEvent.keyboard("{Backspace}");

    expect(onRemoved).toHaveBeenCalled();
    await waitFor(() =>
      expect(sent(requests)).toEqual([
        { id0: CRUST.id, status0: PlanItemStatus.DELETED, doneAt0: null },
      ]),
    );
  });

  it("gives a new item beside a section's own item that item's bucket", async () => {
    const { requests } = renderEditable(null, [pieNode]);
    await userEvent.click(screen.getByRole("button", { name: "Pumpkin pie" }));

    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("Apple pie");
    await leave();

    await waitFor(() =>
      expect(sent(requests)).toEqual([
        { parentId0: "7", afterId0: PIE.id, name0: "Apple pie" },
        { id0: String(FIRST_CREATED_ID), bucketId0: "sat" },
      ]),
    );
  });

  it("offers nothing to edit on an item waiting to be deleted", () => {
    renderEditable(pieNode, pieNode.children, { pendingIds: [CRUST.id] });

    expect(screen.queryByRole("button", { name: "Pie crust" })).toBeNull();
    expect(screen.getByRole("button", { name: "Pie filling" })).toBeVisible();
  });
});
