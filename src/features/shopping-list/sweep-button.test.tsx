import { render, screen, userEvent } from "@/test";
import { describe, expect, it, vi } from "vitest";
import { SweepButton } from "./sweep-button";

describe("SweepButton", () => {
  it("sweeps when pressed", async () => {
    const onSweep = vi.fn();
    render(<SweepButton onSweep={onSweep} />);

    await userEvent.click(
      screen.getByRole("button", { name: "Sweep acquired" }),
    );

    expect(onSweep).toHaveBeenCalledOnce();
  });
});
