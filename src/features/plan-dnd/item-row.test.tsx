import { render, screen, userEvent } from "@/test";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { DragSession, useDragSession } from "./drag-session";
import { ItemRow } from "./item-row";
import { TREE_ZONES } from "./zones";

const DRAG_TYPE = "application/x.gobrennas.test-item";

const ITEMS = [
  { id: "2", name: "Pumpkin pie" },
  { id: "5", name: "Roast turkey" },
];

/** I offer every other row as somewhere to put the one being dragged. */
function Row({
  id,
  name,
  onDropped,
}: {
  id: string;
  name: string;
  onDropped: (text: string) => void;
}) {
  const { dragged } = useDragSession();
  const zones =
    dragged && dragged.id !== id
      ? [
          {
            rect: TREE_ZONES.after,
            indicator: "after" as const,
            label: `Put after ${name}`,
            onDrop: () => onDropped(`${dragged.name} went after ${name}`),
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
}: {
  canMove?: boolean;
  moving?: readonly string[];
}) {
  const [dropped, setDropped] = useState("nothing dropped");
  return (
    <DragSession
      dragType={DRAG_TYPE}
      canMove={canMove}
      isMoving={(id) => moving.includes(id)}
    >
      {ITEMS.map((it) => (
        <Row key={it.id} {...it} onDropped={setDropped} />
      ))}
      <p>{dropped}</p>
    </DragSession>
  );
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

    screen.getByRole("button", { name: "Move Pumpkin pie" }).focus();
    await userEvent.keyboard("{Enter}");
    // Announced once the drag is ready, with focus on the first target.
    expect(await screen.findByText(/Started dragging/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Put after Pumpkin pie" }),
    ).toBeNull();

    expect(
      screen.getByRole("button", { name: "Put after Roast turkey" }),
    ).toHaveFocus();
    await userEvent.keyboard("{Enter}");

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
});
