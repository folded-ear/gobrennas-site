import { buildInMemoryCache, render, screen, seedFragment } from "@/test";
import { describe, expect, it } from "vitest";
import { RecipePhotoFragmentDoc } from "./__generated__/recipePhoto.generated";
import { RecipePhoto } from "./index";

describe("recipe photo display", () => {
  it.each([
    { focus: [0.2, 0.8], expected: "20% 80%" },
    { focus: null, expected: "50% 50%" },
  ])(
    "uses saved focus $focus in the shared card/detail image",
    ({ focus, expected }) => {
      const cache = buildInMemoryCache();
      const recipe = seedFragment(
        cache,
        RecipePhotoFragmentDoc,
        "recipePhoto",
        {
          __typename: "Recipe",
          name: "Lentil soup",
          photo: { __typename: "Photo", url: "/recipe-box.jpg", focus },
        },
        { id: "Recipe:soup" },
      );
      render(<RecipePhoto recipe={recipe} />, { cache });
      expect(screen.getByRole("img", { name: "Lentil soup" })).toHaveStyle({
        objectPosition: expected,
      });
    },
  );
});
