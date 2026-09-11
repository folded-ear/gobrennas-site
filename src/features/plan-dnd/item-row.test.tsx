import { fireEvent, render, screen, waitFor } from "@/test";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { DragSession, useDragSession } from "./drag-session";
import { ItemRow } from "./item-row";
import { keyboardCancel, keyboardDrag, keyboardDrop } from "./keyboard-drag";
import { TREE_ZONES } from "./zones";

const DRAG_TYPE = "application/x.gobrennas.test-item";

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
  canMove = true,
  moving = [],
  offer = "after",
}: {
  canMove?: boolean;
  moving?: readonly string[];
  offer?: Offer;
}) {
  const [dropped, setDropped] = useState("nothing dropped");
  return (
    <DragSession
      dragType={DRAG_TYPE}
      canMove={canMove}
      isMoving={(id) => moving.includes(id)}
    >
      {ITEMS.map((it) => (
        <Row key={it.id} {...it} offer={offer} onDropped={setDropped} />
      ))}
      <p>{dropped}</p>
    </DragSession>
  );
}

// Enough of a DataTransfer for react-aria to start and end a pointer drag.
function dataTransfer() {
  return {
    items: { add: () => {} },
    clearData: () => {},
    setDragImage: () => {},
    effectAllowed: "all",
    dropEffect: "move",
    types: [],
  };
}

// The indicator is decorative and hidden from assistive tech, so nothing
// accessible can find it.
function indicators() {
  return document.querySelectorAll("[data-drop-indicator]");
}

describe("ItemRow", () => {
  it("offers a handle, named for its item, when items can be moved", () => {
    render(<Harness />);

    expect(
      screen.getByRole("button", { name: "Move Pumpkin pie" }),
    ).toBeVisible();
  });

  it("offers no handle when items can't be moved", () => {
    render(<Harness canMove={false} />);

    expect(screen.getByText("Pumpkin pie")).toBeVisible();
    expect(screen.queryByRole("button", { name: /^Move / })).toBeNull();
  });

  it("offers no drop zones until something is dragged", () => {
    render(<Harness />);

    expect(screen.queryByRole("button", { name: /^Put after/ })).toBeNull();
  });

  it("drops an item on another by keyboard", async () => {
    render(<Harness />);

    await keyboardDrag("Move Pumpkin pie");
    expect(
      screen.queryByRole("button", { name: "Put after Pumpkin pie" }),
    ).toBeNull();
    await keyboardDrop("Put after Roast turkey");

    expect(
      await screen.findByText("Pumpkin pie went after Roast turkey"),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: /^Put after/ })).toBeNull();
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
    const handle = screen.getByRole("button", { name: "Move Pumpkin pie" });

    fireEvent.dragStart(handle, { dataTransfer: dataTransfer() });
    expect(
      await screen.findByRole("button", { name: "Put after Roast turkey" }),
    ).toBeInTheDocument();
    // A drop starts the item's move before the drag itself ends.
    rerender(<Harness moving={["2"]} />);
    fireEvent.dragEnd(handle, { dataTransfer: dataTransfer() });

    expect(screen.queryByRole("button", { name: /^Put / })).toBeNull();
    expect(handle).toHaveAttribute("aria-disabled", "true");
  });

  it("drops its mark when the zone it marked goes away mid-drag", async () => {
    const { rerender } = render(<Harness />);

    await keyboardDrag("Move Pumpkin pie");
    await waitFor(() => expect(indicators()).toHaveLength(1));
    rerender(<Harness offer="before" />);

    expect(
      screen.getByRole("button", { name: "Put before Roast turkey" }),
    ).toBeInTheDocument();
    expect(indicators()).toHaveLength(0);

    await keyboardCancel();
  });
});
