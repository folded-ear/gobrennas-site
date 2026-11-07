import { render, screen } from "@/test";
import { describe, expect, it } from "vitest";
import { CookRecipe } from "./index";
import { buildCookRecipe } from "./model";
import { ingredients, pie, ref } from "./test/recipe";
import { CookRecipeTitle } from "./title";

describe("CookRecipe", () => {
  it("does not treat a subrecipe's ingredient quantity as a serving multiplier", () => {
    const recipe = buildCookRecipe(
      [{ ...pie, aggregate: ref("supper") }, ...ingredients],
      "pie",
    );
    if (!recipe)
      throw new Error("The fixture must contain the planned recipe.");
    render(
      <>
        <CookRecipeTitle recipe={recipe} planName="Dinner" />
        <CookRecipe recipe={recipe} />
      </>,
    );
    expect(screen.getByText("8 servings")).toBeVisible();
    expect(screen.getByText("4")).toHaveClass("morsel-quantity");
    expect(screen.getByText("Chill the dough.")).toBeVisible();
  });

  it("shows scaled servings prettily", () => {
    const recipe = buildCookRecipe(
      [
        {
          ...pie,
          quantity: { __typename: "Quantity", quantity: 1 / 6, units: null },
        },
        ...ingredients,
      ],
      "pie",
    );
    if (!recipe)
      throw new Error("The fixture must contain the planned recipe.");
    render(<CookRecipeTitle recipe={recipe} planName="Dinner" />);
    expect(screen.getByText("1⅓ servings")).toBeVisible();
  });
});
