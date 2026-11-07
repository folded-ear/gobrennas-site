import { render, screen, userEvent } from "@/test";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { RecipeScale } from "./recipe-scale";

function Chooser({ onChange }: { onChange: (scale: number) => void }) {
  const [value, setValue] = useState(1);
  return (
    <RecipeScale
      value={value}
      onChange={(scale) => {
        setValue(scale);
        onChange(scale);
      }}
    />
  );
}

describe("RecipeScale", () => {
  it("offers the shared presets and applies a custom positive multiplier", async () => {
    const onChange = vi.fn();
    render(<Chooser onChange={onChange} />);
    expect(screen.getByRole("button", { name: "1×" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await userEvent.click(screen.getByRole("button", { name: "½×" }));
    expect(onChange).toHaveBeenLastCalledWith(0.5);
    const input = screen.getByRole("textbox", { name: "Custom multiplier" });
    await userEvent.clear(input);
    await userEvent.type(input, "1.75");
    await userEvent.click(screen.getByRole("button", { name: "Apply scale" }));
    expect(onChange).toHaveBeenLastCalledWith(1.75);
  });

  it.each(["0", "-2", "Infinity", "not a number"])(
    "rejects %s without emitting a change",
    async (value) => {
      const onChange = vi.fn();
      render(<Chooser onChange={onChange} />);
      const input = screen.getByRole("textbox", { name: "Custom multiplier" });
      await userEvent.clear(input);
      await userEvent.type(input, value);
      expect(screen.getByRole("alert")).toHaveTextContent("greater than zero");
      expect(
        screen.getByRole("button", { name: "Apply scale" }),
      ).toBeDisabled();
      expect(onChange).not.toHaveBeenCalled();
    },
  );
});
