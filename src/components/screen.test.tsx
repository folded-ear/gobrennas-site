import { render, screen, userEvent } from "@/test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Screen, useBlockScreenEscape } from "./screen";

const back = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back }),
}));

beforeEach(() => {
  back.mockReset();
});

function EscapeBlocker({ isBlocked }: { isBlocked: boolean }) {
  useBlockScreenEscape(isBlocked);
  return <p>Roast the pumpkin first.</p>;
}

describe("Screen", () => {
  it("shows its content as a named dialog", () => {
    render(
      <Screen label="Pumpkin pie">
        <p>Roast the pumpkin first.</p>
      </Screen>,
    );

    const dialog = screen.getByRole("dialog", { name: "Pumpkin pie" });
    expect(dialog).toHaveTextContent("Roast the pumpkin first.");
  });

  it("keeps its header in view, out of the content that scrolls", () => {
    render(
      <Screen label="Pumpkin pie" header={<h2>Pumpkin pie</h2>}>
        <p>Roast the pumpkin first.</p>
      </Screen>,
    );

    const heading = screen.getByRole("heading", { name: "Pumpkin pie" });
    const scrolling = screen
      .getByText("Roast the pumpkin first.")
      .closest('[data-slot="drawer-body"]');
    expect(screen.getByRole("dialog")).toContainElement(heading);
    expect(scrolling).not.toBeNull();
    expect(scrolling).not.toContainElement(heading);
  });

  it("shows nothing while closed", () => {
    render(
      <Screen label="Pumpkin pie" isOpen={false}>
        <p>Roast the pumpkin first.</p>
      </Screen>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("goes back when closed", async () => {
    render(
      <Screen label="Pumpkin pie">
        <p>Roast the pumpkin first.</p>
      </Screen>,
    );

    await userEvent.click(screen.getByRole("button", { name: /close/i }));

    expect(back).toHaveBeenCalledTimes(1);
  });

  it("goes back on Escape", async () => {
    render(
      <Screen label="Pumpkin pie">
        <p>Roast the pumpkin first.</p>
      </Screen>,
    );

    await userEvent.keyboard("{Escape}");

    expect(back).toHaveBeenCalledTimes(1);
  });

  it("stays open on Escape while something inside blocks it", async () => {
    render(
      <Screen label="Pumpkin pie">
        <EscapeBlocker isBlocked />
      </Screen>,
    );

    await userEvent.keyboard("{Escape}");

    expect(back).not.toHaveBeenCalled();
  });

  it("goes back on Escape once nothing inside blocks it", async () => {
    const { rerender } = render(
      <Screen label="Pumpkin pie">
        <EscapeBlocker isBlocked />
      </Screen>,
    );

    rerender(
      <Screen label="Pumpkin pie">
        <EscapeBlocker isBlocked={false} />
      </Screen>,
    );
    await userEvent.keyboard("{Escape}");

    expect(back).toHaveBeenCalledTimes(1);
  });
});
