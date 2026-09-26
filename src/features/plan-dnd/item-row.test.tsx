import { Screen } from "@/components/screen";
import { render, screen, userEvent, waitFor } from "@/test";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ACTIVATION_DISTANCE,
  DragSession,
  useDragSession,
} from "./drag-session";
import { ItemRow } from "./item-row";
import {
  getDropZone,
  keyboardCancel,
  keyboardDrag,
  keyboardDrop,
  keyboardMoveTo,
  pointerDrag,
  pointerDrop,
  pointerRelease,
  queryAllDropZones,
  queryDropZone,
} from "./test/dnd-harness";
import { TREE_ZONES } from "./zones";

const back = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back }),
}));

beforeEach(() => {
  back.mockReset();
});

const ITEMS = [
  { id: "2", name: "Pumpkin pie" },
  { id: "5", name: "Roast turkey" },
];

type Offer = "before" | "after";

/** I offer every other row as somewhere to put the one being dragged. */
function Row({
  id,
  name,
  offer,
  onDropped,
}: {
  id: string;
  name: string;
  offer: Offer;
  onDropped: (text: string) => void;
}) {
  const { dragged } = useDragSession();
  const zones =
    dragged && dragged.id !== id
      ? [
          {
            rect: TREE_ZONES[offer],
            indicator: offer,
            label: `Put ${offer} ${name}`,
            onDrop: () => onDropped(`${dragged.name} went ${offer} ${name}`),
          },
        ]
      : [];
  return (
    <ItemRow itemId={id} name={name} zones={zones}>
      <span>{name}</span>
    </ItemRow>
  );
}

function Harness({
  canMove = () => true,
  moving = [],
  offer = "after",
}: {
  canMove?: (itemId: string) => boolean;
  moving?: readonly string[];
  offer?: Offer;
}) {
  const [dropped, setDropped] = useState("nothing dropped");
  return (
    <DragSession canMove={canMove} isMoving={(id) => moving.includes(id)}>
      {ITEMS.map((it) => (
        <Row key={it.id} {...it} offer={offer} onDropped={setDropped} />
      ))}
      <p>{dropped}</p>
    </DragSession>
  );
}

// The indicator is decorative and hidden from assistive tech, so nothing
// accessible can find it.
function indicators(kind: string) {
  return document.querySelectorAll(`[data-drop-indicator="${kind}"]`);
}

describe("ItemRow", () => {
  it("offers a handle, named for its item, when items can be moved", () => {
    render(<Harness />);

    expect(
      screen.getByRole("button", { name: "Move Pumpkin pie" }),
    ).toBeVisible();
  });

  it("offers no handle when items can't be moved", () => {
    render(<Harness canMove={() => false} />);

    expect(screen.getByText("Pumpkin pie")).toBeVisible();
    expect(screen.queryByRole("button", { name: /^Move / })).toBeNull();
  });

  it("offers a handle only on the items that can be moved", () => {
    render(<Harness canMove={(id) => id === "5"} />);

    expect(
      screen.getByRole("button", { name: "Move Roast turkey" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Move Pumpkin pie" }),
    ).toBeNull();
  });

  it("shows its item outside any drag session, offering no handle", () => {
    render(
      <ItemRow itemId="2" name="Pumpkin pie" zones={[]}>
        <span>Pumpkin pie</span>
      </ItemRow>,
    );

    expect(screen.getByText("Pumpkin pie")).toBeVisible();
    expect(screen.queryByRole("button", { name: /^Move / })).toBeNull();
  });

  it("offers no drop zones until something is dragged", () => {
    render(<Harness />);

    expect(queryAllDropZones(/^Put /)).toHaveLength(0);
  });

  it("drops an item on another by keyboard", async () => {
    render(<Harness />);

    await keyboardDrag("Move Pumpkin pie");
    expect(queryDropZone("Put after Pumpkin pie")).toBeNull();
    await keyboardDrop("Put after Roast turkey");

    expect(
      await screen.findByText("Pumpkin pie went after Roast turkey"),
    ).toBeVisible();
    expect(queryAllDropZones(/^Put /)).toHaveLength(0);
  });

  it("drops an item on another by pointer", async () => {
    render(<Harness />);

    await pointerDrag("Move Pumpkin pie");
    await pointerDrop("Put after Roast turkey");

    expect(
      await screen.findByText("Pumpkin pie went after Roast turkey"),
    ).toBeVisible();
    expect(queryAllDropZones(/^Put /)).toHaveLength(0);
  });

  it("starts no drag until a pressed handle moves far enough", async () => {
    render(<Harness />);

    await pointerDrag("Move Pumpkin pie", ACTIVATION_DISTANCE);
    const zones = queryAllDropZones(/^Put /);
    await pointerRelease();

    expect(zones).toHaveLength(0);
  });

  it("marks an item's handle unavailable while it is being moved", () => {
    render(<Harness moving={["2"]} />);

    expect(
      screen.getByRole("button", { name: "Move Pumpkin pie" }),
    ).toHaveAttribute("aria-disabled", "true");
    expect(
      screen.getByRole("button", { name: "Move Roast turkey" }),
    ).not.toHaveAttribute("aria-disabled");
  });

  it("ends a pointer drag even once its item has started moving", async () => {
    const { rerender } = render(<Harness />);

    await pointerDrag("Move Pumpkin pie");
    expect(getDropZone("Put after Roast turkey")).toBeInTheDocument();
    // A drop starts the item's move before the drag itself ends.
    rerender(<Harness moving={["2"]} />);
    await pointerRelease();

    expect(queryAllDropZones(/^Put /)).toHaveLength(0);
    expect(
      screen.getByRole("button", { name: "Move Pumpkin pie" }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  it("drops its mark when the zone it marked goes away mid-drag", async () => {
    const { rerender } = render(<Harness />);

    await keyboardDrag("Move Pumpkin pie");
    await keyboardMoveTo("Put after Roast turkey");
    await waitFor(() => expect(indicators("after")).toHaveLength(1));
    rerender(<Harness offer="before" />);

    expect(getDropZone("Put before Roast turkey")).toBeInTheDocument();
    expect(indicators("after")).toHaveLength(0);

    await keyboardCancel();
  });
});

describe("ItemRow, inside a Screen", () => {
  it("calls off a pointer drag on Escape, leaving its Screen open", async () => {
    render(
      <Screen label="Thanksgiving">
        <Harness />
      </Screen>,
    );

    await pointerDrag("Move Pumpkin pie");
    expect(getDropZone("Put after Roast turkey")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");

    expect(queryAllDropZones(/^Put /)).toHaveLength(0);
    expect(back).not.toHaveBeenCalled();
    await pointerRelease();
  });

  it("calls off a keyboard drag on Escape, leaving its Screen open", async () => {
    render(
      <Screen label="Thanksgiving">
        <Harness />
      </Screen>,
    );

    await keyboardDrag("Move Pumpkin pie");
    await keyboardCancel();

    expect(queryAllDropZones(/^Put /)).toHaveLength(0);
    expect(back).not.toHaveBeenCalled();
  });

  it("lets its Screen close on Escape once a drag is dropped", async () => {
    render(
      <Screen label="Thanksgiving">
        <Harness />
      </Screen>,
    );

    await pointerDrag("Move Pumpkin pie");
    await pointerDrop("Put after Roast turkey");
    await screen.findByText("Pumpkin pie went after Roast turkey");
    await userEvent.keyboard("{Escape}");

    expect(back).toHaveBeenCalledTimes(1);
  });
});
