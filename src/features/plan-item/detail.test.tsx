import { PlanItemStatus } from "@/__generated__/graphql";
import {
  buildPlanDirectory,
  PlanDirectoryProvider,
} from "@/features/plan-directory";
import { PlanDnd } from "@/features/plan-dnd";
import {
  keyboardCancel,
  keyboardDrag,
  keyboardDrop,
} from "@/features/plan-dnd/keyboard-drag";
import { buildPlanTree } from "@/features/plan-dnd/moves";
import { PlanMoves } from "@/features/plan-dnd/use-plan-moves";
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
} from "@/test";
import { FragmentType } from "@apollo/client";
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
    const cache = buildInMemoryCache();
    const pie = seedFragment(
      cache,
      PlanItemFragmentDoc,
      "planItem",
      fragment(PIE, null),
    );
    seedFragment(cache, PlanItemFragmentDoc, "planItem", fragment(CRUST, null));
    seedFragment(
      cache,
      PlanItemFragmentDoc,
      "planItem",
      fragment(FILLING, null),
    );
    render(
      <PlanDirectoryProvider
        directory={buildPlanDirectory([
          {
            id: "7",
            name: "Holidays",
            color: "#F57F17",
            mine: true,
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

    expect(
      screen.getByRole("link", { name: "Cook Pie crust" }),
    ).toHaveAttribute("href", "/plan/7/recipe/43");
    expect(
      screen.getByRole("link", { name: "Cook Pumpkin pie" }),
    ).toHaveAttribute("href", "/plan/7/recipe/42");
    expect(screen.queryByRole("link", { name: "Cook Pie filling" })).toBeNull();
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
    isMoving: () => false,
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

    expect(
      screen.getByRole("button", { name: "Nest under Pie filling" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Put after Pie filling" }),
    ).toBeInTheDocument();
    // The crust already comes right before the filling.
    expect(
      screen.queryByRole("button", { name: "Put before Pie filling" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", {
        name: /^(Nest under|Put \w+) Pie crust$/,
      }),
    ).toBeNull();

    await keyboardCancel();
  });

  it("offers a row's zones in reading order", async () => {
    renderMovable();

    await keyboardDrag("Move Pie filling");

    expect(
      screen
        .getAllByRole("button", { name: /^(Nest under|Put \w+) Pie crust$/ })
        .map((zone) => zone.getAttribute("aria-label")),
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
        descendants: [PIE, CRUST, FILLING],
        buckets: [],
      },
      {
        id: "9",
        name: "Weeknights",
        color: "#1E88E5",
        mine: true,
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

    expect(
      screen.getByRole("button", { name: "Nest under Pumpkin pie" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^Put \w+ Pumpkin pie$/ }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "Put before Pie crust" }),
    ).toBeInTheDocument();

    await keyboardCancel();
  });

  it("offers nowhere in another plan to drop an item", async () => {
    renderSection([pieNode, tacosNode]);

    await keyboardDrag("Move Pie filling");

    expect(
      screen.queryAllByRole("button", {
        name: /^(Nest under|Put \w+) (Tacos|Salsa)$/,
      }),
    ).toHaveLength(0);
    expect(
      screen.getByRole("button", { name: "Nest under Pie crust" }),
    ).toBeInTheDocument();

    await keyboardCancel();
  });
});
