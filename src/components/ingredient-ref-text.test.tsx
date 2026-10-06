import { render, screen } from "@/test";
import { describe, expect, it } from "vitest";
import { IngredientRefText } from "./ingredient-ref-text";

describe("IngredientRefText", () => {
  it("omits absent units", () => {
    render(<IngredientRefText text="" quantity={2} name="eggs" />);
    expect(screen.getByText("2")).toHaveClass("morsel-quantity");
    expect(screen.getByText("eggs").parentElement).toHaveTextContent(
      /^2 eggs$/,
    );
  });

  it("marks a zero quantity NO in place of its quantity and unit", () => {
    render(<IngredientRefText text="" quantity={0} unit="tsp" name="salt" />);
    expect(screen.getByText("NO")).toBeVisible();
    expect(screen.getByText("salt").parentElement).toHaveTextContent(
      /^NO salt$/,
    );
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
