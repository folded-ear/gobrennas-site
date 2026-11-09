import { recipe } from "@/features/recipe-detail/test/recipe";
import { SharedRecipeDocument } from "@/screens/__generated__/shared-recipe.generated";
import { act, render, screen } from "@/test";
import { Suspense } from "react";
import { describe, expect, it } from "vitest";
import { SharedRecipe } from "./shared-recipe";

const ID = "631";
const SECRET = "dde7cce2c7641a3b2b17506e377849550fa367c6";

const sharedPie = {
  ...recipe,
  id: ID,
  ownedBy: {
    __typename: "User" as const,
    id: "brenna",
    name: "Brenna Switzer",
    email: "brenna@example.test",
    imageUrl: null,
  },
};

describe("SharedRecipe", () => {
  it("shows the recipe the secret unlocks, with nothing to act on", async () => {
    await act(async () => {
      render(
        <Suspense>
          <SharedRecipe id={ID} secret={SECRET} />
        </Suspense>,
        {
          mocks: [
            {
              request: {
                query: SharedRecipeDocument,
                variables: { id: ID, secret: SECRET },
              },
              result: {
                data: {
                  library: {
                    __typename: "LibraryQuery",
                    getRecipeById: sharedPie,
                  },
                },
              },
            },
          ],
        },
      );
    });

    expect(
      await screen.findByRole("heading", { name: "Apple pie", level: 1 }),
    ).toBeVisible();
    expect(screen.getByTitle("Brenna Switzer")).toBeVisible();
    expect(screen.getByText("apples")).toHaveClass("morsel-ingredient");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
