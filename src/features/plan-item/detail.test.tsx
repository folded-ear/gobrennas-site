import { PlanItemStatus } from "@/__generated__/graphql";
import { PlanDnd } from "@/features/plan-dnd";
import {
  keyboardCancel,
  keyboardDrag,
  keyboardDrop,
} from "@/features/plan-dnd/keyboard-drag";
import { buildPlanTree } from "@/features/plan-dnd/moves";
import { PlanMoves } from "@/features/plan-dnd/use-plan-moves";
import { PlanItemNode, TimelineItem } from "@/features/plan-timeline/model";
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
import { PlanItemDetail } from "./detail";

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

function node({ id, name }: Spec): PlanItemNode {
  const item: TimelineItem = {
    __typename: "PlanItem",
    id,
    name,
    bucket: null,
    children: [],
  };
  return { item, children: [] };
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
    <PlanItemDetail item={pie} descendants={descendants} onSelect={onSelect} />,
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

    expect(screen.getByRole("button", { name: "Pie crust" })).toBeVisible();
  });

  it("shows only the item when nothing sits below it", () => {
    renderDetail(null, []);

    expect(screen.queryByRole("list")).toBeNull();
  });

  it("passes a chosen descendant up", async () => {
    const onSelect = vi.fn();
    renderDetail(null, [node(CRUST)], onSelect);

    await userEvent.click(screen.getByRole("button", { name: "Pie crust" }));

    expect(onSelect).toHaveBeenCalledWith("43");
  });
});

// Plan 7: Pumpkin pie (42), holding Pie crust (43) then Pie filling (44).
function pieTree() {
  return buildPlanTree({ id: "7", children: [{ id: PIE.id }] }, [
    { id: PIE.id, children: [{ id: CRUST.id }, { id: FILLING.id }] },
    { id: CRUST.id, children: [] },
    { id: FILLING.id, children: [] },
  ]);
}

function fakeMoves(): PlanMoves {
  return { moveInTree: vi.fn(), moveToDate: vi.fn(), isMoving: () => false };
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
    <PlanItemDetail
      item={pie}
      descendants={[node(CRUST), node(FILLING)]}
      dnd={{ tree: pieTree(), canMove: true, moves: fakeMoves(), ...dnd }}
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
    renderMovable({ canMove: false });

    expect(screen.getByRole("button", { name: "Pie crust" })).toBeVisible();
    expect(screen.queryByRole("button", { name: /^Move / })).toBeNull();
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
