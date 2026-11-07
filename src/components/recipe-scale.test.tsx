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
  it("applies a preset immediately without an input or apply button", async () => {
    const onChange = vi.fn();
    render(<Chooser onChange={onChange} />);
    expect(screen.getByText("scale")).toHaveClass("text-sm", "text-muted");
    expect(screen.getByRole("button", { name: "1×" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await userEvent.click(screen.getByRole("button", { name: "½×" }));
    expect(onChange).toHaveBeenLastCalledWith(0.5);
    expect(screen.getByRole("button", { name: "½×" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Apply scale" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("button").map((button) => button.textContent),
    ).toEqual(["¼×", "½×", "1×", "2×"]);
  });

  it("does not apply a scale when disabled", async () => {
    const onChange = vi.fn();
    render(<RecipeScale value={1} onChange={onChange} isDisabled />);
    for (const button of screen.getAllByRole("button"))
      expect(button).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "2×" }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
