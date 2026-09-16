import { buildInMemoryCache, render, screen, userEvent, waitFor } from "@/test";
import { MockLink } from "@apollo/client/testing";
import { describe, expect, it, vi } from "vitest";
import { CreateRecipeDocument } from "./__generated__/createRecipe.generated";
import { CreateRecipeForm } from "./create-recipe-form";

const CREATED_RECIPE_ID = "recipe-cider-chicken";
const INITIAL_LIBRARY = {
  __typename: "LibraryQuery",
  recipes: {
    __typename: "RecipeConnection",
    edges: [],
    pageInfo: { __typename: "PageInfo", hasNextPage: false, endCursor: null },
  },
};

function seedLibrary(cache: ReturnType<typeof buildInMemoryCache>): void {
  cache.restore({
    ROOT_QUERY: { __typename: "Query", library: INITIAL_LIBRARY },
  });
}

function libraryIn(cache: ReturnType<typeof buildInMemoryCache>) {
  return cache.extract().ROOT_QUERY?.library;
}

function successfulCreateMock(): MockLink.MockedResponse {
  return {
    request: {
      query: CreateRecipeDocument,
      variables: {
        info: {
          type: "Recipe",
          name: "Cider-braised chicken",
          directions: "Brown the chicken.\n\nFinish with cider.  ",
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
  };
}

describe("CreateRecipeForm", () => {
  it("creates a recipe with the serialized draft and invalidates Library before reporting its id", async () => {
    const user = userEvent.setup();
    const cache = buildInMemoryCache();
    const onCreated = vi.fn(() => {
      expect(libraryIn(cache)).toBeUndefined();
    });
    seedLibrary(cache);

    render(<CreateRecipeForm onCreated={onCreated} onCancel={vi.fn()} />, {
      cache,
      mocks: [successfulCreateMock()],
    });

    await user.type(
      screen.getByRole("textbox", { name: /title/i }),
      "  Cider-braised chicken  ",
    );
    await user.type(
      screen.getByRole("textbox", { name: /directions/i }),
      "Brown the chicken.\n\nFinish with cider.  ",
    );
    await user.click(screen.getByRole("button", { name: /save recipe/i }));

    await waitFor(() =>
      expect(onCreated).toHaveBeenCalledWith(CREATED_RECIPE_ID),
    );
    expect(libraryIn(cache)).toBeUndefined();
    expect(JSON.stringify(CreateRecipeDocument)).toContain(
      '"name":{"kind":"Name","value":"cookThis"},"value":{"kind":"BooleanValue","value":false}',
    );
  });

  it("keeps the cached Library and does not report a created recipe when the mutation fails", async () => {
    const user = userEvent.setup();
    const cache = buildInMemoryCache();
    const onCreated = vi.fn();
    seedLibrary(cache);

    render(<CreateRecipeForm onCreated={onCreated} onCancel={vi.fn()} />, {
      cache,
      mocks: [
        {
          request: {
            query: CreateRecipeDocument,
            variables: {
              info: {
                type: "Recipe",
                name: "Cider-braised chicken",
                directions: "Keep the lid on.",
              },
            },
          },
          error: new Error("Network unavailable"),
        },
      ],
    });

    await user.type(
      screen.getByRole("textbox", { name: /title/i }),
      "Cider-braised chicken",
    );
    await user.type(
      screen.getByRole("textbox", { name: /directions/i }),
      "Keep the lid on.",
    );
    await user.click(screen.getByRole("button", { name: /save recipe/i }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /title/i })).toHaveValue(
      "Cider-braised chicken",
    );
    expect(screen.getByRole("textbox", { name: /directions/i })).toHaveValue(
      "Keep the lid on.",
    );
    expect(libraryIn(cache)).toEqual(INITIAL_LIBRARY);
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("treats a create response without a recipe id as a failed save", async () => {
    const user = userEvent.setup();
    const cache = buildInMemoryCache();
    const onCreated = vi.fn();
    seedLibrary(cache);

    render(<CreateRecipeForm onCreated={onCreated} onCancel={vi.fn()} />, {
      cache,
      mocks: [
        {
          request: {
            query: CreateRecipeDocument,
            variables: {
              info: {
                type: "Recipe",
                name: "Cider-braised chicken",
                directions: "Keep the lid on.",
              },
            },
          },
          result: {
            data: {
              library: {
                __typename: "LibraryMutation",
                createRecipe: { __typename: "Recipe", id: "" },
              },
            },
          },
        },
      ],
    });

    await user.type(
      screen.getByRole("textbox", { name: /title/i }),
      "Cider-braised chicken",
    );
    await user.type(
      screen.getByRole("textbox", { name: /directions/i }),
      "Keep the lid on.",
    );
    await user.click(screen.getByRole("button", { name: /save recipe/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn’t save recipe",
    );
    expect(libraryIn(cache)).toEqual(INITIAL_LIBRARY);
    expect(onCreated).not.toHaveBeenCalled();
  });
});
