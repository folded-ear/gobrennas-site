import { render, screen, userEvent } from "@/test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Screen } from "./screen";

const back = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back }),
}));

beforeEach(() => {
  back.mockReset();
});

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
});
