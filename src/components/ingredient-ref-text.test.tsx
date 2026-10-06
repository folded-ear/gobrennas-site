import { render, screen } from "@/test";
import { describe, expect, it } from "vitest";
import { IngredientRefText } from "./ingredient-ref-text";

describe("IngredientRefText", () => {
  it("keeps zero quantities and omits absent units", () => {
    render(<IngredientRefText text="" quantity={0} name="salt" />);
    expect(screen.getByText("0")).toHaveClass("morsel-quantity");
    expect(screen.getByText("salt")).toHaveClass("morsel-ingredient");
  });

  it("keeps unrecognized wording as ordinary text", () => {
    render(<IngredientRefText text="a pinch of mystery spice" />);
    expect(screen.getByText("a pinch of mystery spice")).toHaveClass(
      "morsel-text",
    );
    expect(screen.getByText("a pinch of mystery spice")).not.toHaveClass(
      "morsel-ingredient",
    );
  });
});
