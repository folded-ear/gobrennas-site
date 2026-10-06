import { Screen } from "@/components/screen";
import { render, screen, userEvent, waitFor } from "@/test";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DragSession, useDragSession } from "./drag-session";
import { ItemRow } from "./item-row";
import {
  keyboardCancel,
  keyboardDrag,
  keyboardDrop,
} from "./test/keyboard-drag";
import { TREE_ZONES } from "./zones";

const back = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back }),
}));

beforeEach(() => {
  back.mockReset();
});

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
  canMove = () => true,
  offer = "after",
}: {
  canMove?: (itemId: string) => boolean;
  offer?: Offer;
}) {
  const [dropped, setDropped] = useState("nothing dropped");
  return (
    <DragSession dragType={DRAG_TYPE} canMove={canMove}>
      {ITEMS.map((it) => (
        <Row key={it.id} {...it} offer={offer} onDropped={setDropped} />
      ))}
      <p>{dropped}</p>
    </DragSession>
  );
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

  it("starts no drag when its handle is clicked with a mouse", async () => {
    render(<Harness />);

    await userEvent.click(
      screen.getByRole("button", { name: "Move Pumpkin pie" }),
    );
    const zones = screen.queryAllByRole("button", { name: /^Put / });
    // A drag listens for Escape only from the frame after it starts.
    await new Promise(requestAnimationFrame);
    await keyboardCancel();

    expect(zones).toHaveLength(0);
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

describe("ItemRow, inside a Screen", () => {
  it("calls off a keyboard drag on Escape, leaving its Screen open", async () => {
    render(
      <Screen label="Thanksgiving">
        <Harness />
      </Screen>,
    );

    await keyboardDrag("Move Pumpkin pie");
    await keyboardCancel();

    expect(screen.queryByRole("button", { name: /^Put / })).toBeNull();
    expect(back).not.toHaveBeenCalled();
  });

  it("lets its Screen close on Escape once a drag is dropped", async () => {
    render(
      <Screen label="Thanksgiving">
        <Harness />
      </Screen>,
    );

    await keyboardDrag("Move Pumpkin pie");
    await keyboardDrop("Put after Roast turkey");
    await screen.findByText("Pumpkin pie went after Roast turkey");
    // A drop ends its drag a moment later, handing focus back to the handle.
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Move Pumpkin pie" }),
      ).toHaveFocus(),
    );
    await userEvent.keyboard("{Escape}");

    expect(back).toHaveBeenCalledTimes(1);
  });
});
