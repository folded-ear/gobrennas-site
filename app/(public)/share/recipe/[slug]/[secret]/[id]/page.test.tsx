import { getRecipeMetadata } from "@/data-rsc/get-recipe-metadata";
import { isAuthenticated } from "@/data-rsc/is-authenticated";
import { CombinedGraphQLErrors } from "@apollo/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SharedRecipePage, { generateMetadata } from "./page";

vi.mock("@/data-rsc/get-recipe-metadata", () => ({
  getRecipeMetadata: vi.fn(),
}));
vi.mock("@/data-rsc/is-authenticated", () => ({ isAuthenticated: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("not found");
  },
  redirect: (url: string) => {
    throw new Error(`redirect to ${url}`);
  },
}));

const params = {
  slug: "chicken-souvlakia",
  secret: "dde7cce2c7641a3b2b17506e377849550fa367c6",
  id: "631",
};
const props = { params: Promise.resolve(params) };

const recipeMetadata = vi.mocked(getRecipeMetadata);
const signedIn = vi.mocked(isAuthenticated);

beforeEach(() => {
  recipeMetadata.mockReset();
  recipeMetadata.mockResolvedValue({
    __typename: "Recipe",
    id: params.id,
    name: "Chicken souvlakia",
  });
  signedIn.mockReset();
  signedIn.mockResolvedValue(false);
});

describe("shared recipe page", () => {
  it("titles the page with the recipe's name", async () => {
    expect(await generateMetadata(props)).toEqual({
      title: "Chicken souvlakia",
    });
  });

  it("sends a signed-in viewer to the recipe in their library", async () => {
    signedIn.mockResolvedValue(true);

    await expect(SharedRecipePage(props)).rejects.toThrow(
      "redirect to /recipes/631",
    );
  });

  it("is not found when the API refuses the secret", async () => {
    recipeMetadata.mockRejectedValue(
      new CombinedGraphQLErrors({ errors: [{ message: "Unauthorized" }] }),
    );

    await expect(SharedRecipePage(props)).rejects.toThrow("not found");
    await expect(generateMetadata(props)).rejects.toThrow("not found");
  });

  it("lets a failure to reach the API through as an error", async () => {
    recipeMetadata.mockRejectedValue(new TypeError("fetch failed"));

    await expect(SharedRecipePage(props)).rejects.toThrow("fetch failed");
  });
});
