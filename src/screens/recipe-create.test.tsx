import { CreateRecipeDocument } from "@/features/recipe-form/__generated__/createRecipe.generated";
import { render, screen, userEvent, waitFor } from "@/test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecipeCreate } from "./recipe-create";

const CREATED_RECIPE_ID = "recipe-cider-chicken";
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

beforeEach(() => {
  replace.mockReset();
});

describe("RecipeCreate", () => {
  it("renders the Add Recipe page and its form", () => {
    render(<RecipeCreate />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Add Recipe" }),
    ).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Title" })).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Directions" })).toBeVisible();
  });

  it("replaces the create route with the new recipe after a successful save", async () => {
    const user = userEvent.setup();

    render(<RecipeCreate />, {
      mocks: [
        {
          request: {
            query: CreateRecipeDocument,
            variables: {
              info: {
                type: "Recipe",
                name: "Cider-braised chicken",
                externalUrl: null,
                yield: null,
                totalTime: null,
                calories: null,
                directions: "Brown the chicken first.",
              },
            },
          },
          result: {
            data: {
              library: {
                __typename: "LibraryMutation",
                createRecipe: {
                  __typename: "Recipe",
                  id: CREATED_RECIPE_ID,
                },
              },
            },
          },
        },
      ],
    });

    await user.type(
      screen.getByRole("textbox", { name: "Title" }),
      "Cider-braised chicken",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Directions" }),
      "Brown the chicken first.",
    );
    await user.click(screen.getByRole("button", { name: "Save recipe" }));

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(`/recipes/${CREATED_RECIPE_ID}`),
    );
  });

  it("replaces the create route with the Library when canceled", async () => {
    const user = userEvent.setup();
    render(<RecipeCreate />);

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(replace).toHaveBeenCalledWith("/recipes");
  });
});
