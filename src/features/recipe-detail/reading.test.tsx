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
import { recipe } from "./test/recipe";

const sharedPie = {
  ...recipe,
  mine: false,
  ownedBy: {
    __typename: "User" as const,
    id: "brenna",
    name: "Brenna Switzer",
    email: "brenna@example.test",
    imageUrl: null,
  },
};

function seed(value = sharedPie) {
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
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("group", { name: "Recipe actions" }),
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
