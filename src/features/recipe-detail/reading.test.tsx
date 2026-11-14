import {
  buildInMemoryCache,
  render,
  screen,
  seedFragment,
  userEvent,
  within,
} from "@/test";
import { Button } from "@heroui/react";
import { describe, expect, it, vi } from "vitest";
import { RecipeReadingFragmentDoc } from "./__generated__/recipeReading.generated";
import { RecipeReading } from "./reading";
import { borrowedRecipe, recipe } from "./test/recipe";

function seed(value = borrowedRecipe) {
  const cache = buildInMemoryCache();
  const ref = seedFragment(
    cache,
    RecipeReadingFragmentDoc,
    "recipeReading",
    value,
  );
  return { cache, ref };
}

describe("RecipeReading", () => {
  it("shows the recipe and its owner, with nothing to act on", () => {
    const { cache, ref } = seed();

    render(<RecipeReading recipe={ref} />, { cache });

    expect(
      screen.getByRole("heading", { name: "Apple pie", level: 1 }),
    ).toBeVisible();
    expect(screen.getByTitle("Brenna Switzer")).toBeVisible();
    expect(screen.getByText("8 servings")).toBeVisible();
    expect(screen.getByText("apples")).toHaveClass("morsel-ingredient");
    expect(screen.getByText(/Bake until golden/).textContent).toBe(
      recipe.directions,
    );
    expect(
      within(screen.getByRole("region", { name: "Crust" })).getByText(
        "Chill the dough.",
      ),
    ).toBeVisible();
    expect(
      screen.getAllByRole("button").map((button) => button.textContent),
    ).toEqual(["Crust", "Whipped cream", "Caramel sauce"]);
    expect(
      screen.queryByRole("group", { name: "Recipe actions" }),
    ).not.toBeInTheDocument();
  });

  it("starts with its sections expanded", () => {
    const { cache, ref } = seed();

    render(<RecipeReading recipe={ref} />, { cache });

    for (const name of ["Crust", "Whipped cream"])
      expect(screen.getByRole("button", { name })).toHaveAttribute(
        "aria-expanded",
        "true",
      );
  });

  it("shows recipes used as ingredients after the sections, collapsed", async () => {
    const { cache, ref } = seed();

    render(<RecipeReading recipe={ref} />, { cache });

    expect(
      screen
        .getAllByRole("heading", { level: 2 })
        .map((heading) => heading.textContent)
        .slice(-3),
    ).toEqual(["Crust", "Whipped cream", "Caramel sauce"]);
    const caramel = within(
      screen.getByRole("region", { name: "Caramel sauce" }),
    );
    const toggle = caramel.getByRole("button", { name: "Caramel sauce" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(caramel.getByText("25 min")).not.toBeVisible();

    await userEvent.click(toggle);

    expect(caramel.getByText("25 min")).toBeVisible();
    expect(caramel.getByText("1 cup heavy cream")).toBeVisible();
    expect(
      caramel.getByText("Cook the sugar to amber, then whisk in the cream."),
    ).toBeVisible();
    expect(
      caramel.queryByRole("link", { name: "Caramel sauce" }),
    ).not.toBeInTheDocument();
  });

  it("sets its actions before Close", async () => {
    const { cache, ref } = seed();
    const onClose = vi.fn();

    render(
      <RecipeReading
        recipe={ref}
        actions={<Button>Cook it</Button>}
        onClose={onClose}
      />,
      { cache },
    );

    const actions = screen.getByRole("group", { name: "Recipe actions" });
    expect(
      within(actions)
        .getAllByRole("button")
        .map((button) => button.textContent || button.ariaLabel),
    ).toEqual(["Cook it", "Close recipe"]);
    await userEvent.click(
      within(actions).getByRole("button", { name: "Close recipe" }),
    );
    expect(onClose).toHaveBeenCalledOnce();
  });
});
