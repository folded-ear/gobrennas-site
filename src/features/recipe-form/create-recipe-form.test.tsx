import {
  RecognizedRangeType,
  type IngredientRefInfo,
  type SectionInfo,
} from "@/__generated__/graphql";
import { editableMorsel } from "@/features/morsel/test-helpers";
import { buildInMemoryCache, render, screen, userEvent, waitFor } from "@/test";
import { MockLink } from "@apollo/client/testing";
import { describe, expect, it, vi } from "vitest";
import { CreateRecipeDocument } from "./__generated__/createRecipe.generated";
import { RecipeLabelSuggestionsDocument } from "./__generated__/recipeLabelSuggestions.generated";
import {
  RecognizeIngredientDocument,
  type RecognizeIngredientQuery,
} from "./__generated__/recognizeIngredient.generated";
import { CreateRecipeForm } from "./create-recipe-form";

const CREATED_RECIPE_ID = "recipe-cider-chicken";
const BLANK_METADATA_RECIPE_ID = "recipe-plain-polenta";
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

function successfulCreateMock(
  info: {
    externalUrl: string | null;
    yield: number | null;
    totalTime: number | null;
    calories: number | null;
    name: string;
    directions: string;
    ingredients?: IngredientRefInfo[];
    sections?: SectionInfo[];
    labels?: string[];
  },
  id = CREATED_RECIPE_ID,
): MockLink.MockedResponse {
  return {
    request: {
      query: CreateRecipeDocument,
      variables: {
        info: {
          type: "Recipe",
          ingredients: [],
          sections: [],
          labels: [],
          ...info,
        },
      },
    },
    result: {
      data: {
        library: {
          __typename: "LibraryMutation",
          createRecipe: {
            __typename: "Recipe",
            id,
          },
        },
      },
    },
  };
}

describe("CreateRecipeForm", () => {
  it("creates multiple owned sections through the existing mutation with null ids", async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    render(<CreateRecipeForm onCreated={onCreated} onCancel={vi.fn()} />, {
      mocks: [
        {
          request: { query: RecipeLabelSuggestionsDocument },
          maxUsageCount: 2,
          result: { data: { labels: { __typename: "LabelsQuery", all: [] } } },
        },
        successfulCreateMock({
          name: "Pie",
          externalUrl: null,
          yield: null,
          totalTime: null,
          calories: null,
          directions: "",
          sections: [
            {
              id: null,
              name: "Crust",
              directions: "Chill the dough.",
              ingredients: [],
            },
            { id: null, name: "Filling", directions: "", ingredients: [] },
          ],
        }),
      ],
    });
    await user.type(screen.getByRole("textbox", { name: "Title" }), "Pie");
    await user.click(screen.getByRole("button", { name: "Add section" }));
    await user.type(
      screen.getByRole("textbox", { name: "Section 1 title" }),
      "Crust",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Section 1 directions" }),
      "Chill the dough.",
    );
    await user.click(screen.getByRole("button", { name: "Add section" }));
    await user.type(
      screen.getByRole("textbox", { name: "Section 2 title" }),
      "Filling",
    );
    await user.click(screen.getByRole("button", { name: "Save recipe" }));
    await waitFor(() =>
      expect(onCreated).toHaveBeenCalledWith(CREATED_RECIPE_ID),
    );
  });

  it("recognizes a row through Apollo and sends parsed ids and values when creating the recipe", async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    const raw = "2 cups flour";
    const recognition: MockLink.MockedResponse<RecognizeIngredientQuery> = {
      request: {
        query: RecognizeIngredientDocument,
        variables: { raw, cursor: raw.length, choice: null, suggest: true },
      },
      result: {
        data: {
          library: {
            __typename: "LibraryQuery",
            recognizeItem: {
              __typename: "RecognizedItem",
              raw,
              cursor: raw.length,
              suggestions: [],
              ranges: [
                {
                  __typename: "RecognizedRange",
                  start: 0,
                  end: 1,
                  type: RecognizedRangeType.QUANTITY,
                  quantity: 2,
                  id: null,
                },
                {
                  __typename: "RecognizedRange",
                  start: 2,
                  end: 6,
                  type: RecognizedRangeType.UNIT,
                  quantity: null,
                  id: "unit-cup",
                },
                {
                  __typename: "RecognizedRange",
                  start: 7,
                  end: 12,
                  type: RecognizedRangeType.ITEM,
                  quantity: null,
                  id: "pantry-flour",
                },
              ],
            },
          },
        },
      },
    };
    render(<CreateRecipeForm onCreated={onCreated} onCancel={vi.fn()} />, {
      mocks: [
        {
          request: { query: RecipeLabelSuggestionsDocument },
          maxUsageCount: 2,
          result: { data: { labels: { __typename: "LabelsQuery", all: [] } } },
        },
        recognition,
        successfulCreateMock({
          name: "Bread",
          externalUrl: null,
          yield: null,
          totalTime: null,
          calories: null,
          directions: "",
          ingredients: [
            {
              raw,
              quantity: 2,
              uomId: "unit-cup",
              ingredientId: "pantry-flour",
            },
          ],
        }),
      ],
    });
    await user.type(screen.getByRole("textbox", { name: "Title" }), "Bread");
    await user.type(editableMorsel("Ingredient 1"), raw);
    expect(await screen.findByText("Quantity")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Save recipe" }));
    await waitFor(() =>
      expect(onCreated).toHaveBeenCalledWith(CREATED_RECIPE_ID),
    );
  });

  it("saves reordered raw ingredients without sending placeholder rows or client IDs", async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    render(<CreateRecipeForm onCreated={onCreated} onCancel={vi.fn()} />, {
      mocks: [
        {
          request: { query: RecipeLabelSuggestionsDocument },
          maxUsageCount: 2,
          result: { data: { labels: { __typename: "LabelsQuery", all: [] } } },
        },
        ...[" 2 cups flour ", "1 tsp salt"].map((raw, index) => ({
          request: {
            query: RecognizeIngredientDocument,
            variables: {
              raw,
              cursor: raw.length,
              choice: null,
              suggest: index === 1,
            },
          },
          delay: 1000,
          result: {
            data: {
              library: {
                __typename: "LibraryQuery" as const,
                recognizeItem: {
                  __typename: "RecognizedItem" as const,
                  raw,
                  cursor: raw.length,
                  ranges: [],
                  suggestions: [],
                },
              },
            },
          },
        })),
        successfulCreateMock({
          name: "Bread",
          externalUrl: null,
          yield: null,
          totalTime: null,
          calories: null,
          directions: "",
          ingredients: [{ raw: "1 tsp salt" }, { raw: " 2 cups flour " }],
        }),
      ],
    });
    await user.type(screen.getByRole("textbox", { name: "Title" }), "Bread");
    await user.click(editableMorsel("Ingredient 1"));
    await user.paste(" 2 cups flour \n1 tsp salt\n");
    await user.click(
      screen.getByRole("button", { name: "Move ingredient 2 up" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Add ingredient below 1" }),
    );
    await user.click(screen.getByRole("button", { name: "Save recipe" }));
    await waitFor(() =>
      expect(onCreated).toHaveBeenCalledWith(CREATED_RECIPE_ID),
    );
  });

  it("creates a recipe with serialized metadata and invalidates Library before reporting its id", async () => {
    const user = userEvent.setup();
    const cache = buildInMemoryCache();
    const onCreated = vi.fn(() => {
      expect(libraryIn(cache)).toBeUndefined();
    });
    seedLibrary(cache);

    render(<CreateRecipeForm onCreated={onCreated} onCancel={vi.fn()} />, {
      cache,
      mocks: [
        {
          request: { query: RecipeLabelSuggestionsDocument },
          maxUsageCount: 2,
          result: { data: { labels: { __typename: "LabelsQuery", all: [] } } },
        },
        successfulCreateMock({
          externalUrl: "https://recipes.example.test/cider-chicken",
          yield: 6,
          totalTime: 4_800_000,
          calories: 460,
          name: "Cider-braised chicken",
          directions: "Brown the chicken.\n\nFinish with cider.  ",
        }),
      ],
    });

    await user.type(
      screen.getByRole("textbox", { name: /title/i }),
      "  Cider-braised chicken  ",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Source URL" }),
      "  https://recipes.example.test/cider-chicken  ",
    );
    await user.type(screen.getByRole("spinbutton", { name: "Yield" }), "6");
    await user.type(
      screen.getByRole("textbox", { name: "Total cook time" }),
      "1 hr 20 min",
    );
    await user.type(
      screen.getByRole("spinbutton", { name: "Calories per serving" }),
      "460",
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

  it("creates a recipe with blank optional metadata as explicit nulls and invalidates Library before reporting its id", async () => {
    const user = userEvent.setup();
    const cache = buildInMemoryCache();
    const onCreated = vi.fn(() => {
      expect(libraryIn(cache)).toBeUndefined();
    });
    seedLibrary(cache);

    render(<CreateRecipeForm onCreated={onCreated} onCancel={vi.fn()} />, {
      cache,
      mocks: [
        {
          request: { query: RecipeLabelSuggestionsDocument },
          maxUsageCount: 2,
          result: { data: { labels: { __typename: "LabelsQuery", all: [] } } },
        },
        successfulCreateMock(
          {
            externalUrl: null,
            yield: null,
            totalTime: null,
            calories: null,
            name: "Plain polenta",
            directions: "Stir until creamy.",
          },
          BLANK_METADATA_RECIPE_ID,
        ),
      ],
    });

    await user.type(
      screen.getByRole("textbox", { name: /title/i }),
      "Plain polenta",
    );
    await user.type(
      screen.getByRole("textbox", { name: /directions/i }),
      "Stir until creamy.",
    );
    await user.click(screen.getByRole("button", { name: /save recipe/i }));

    await waitFor(() =>
      expect(onCreated).toHaveBeenCalledWith(BLANK_METADATA_RECIPE_ID),
    );
    expect(libraryIn(cache)).toBeUndefined();
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
          request: { query: RecipeLabelSuggestionsDocument },
          maxUsageCount: 2,
          result: { data: { labels: { __typename: "LabelsQuery", all: [] } } },
        },
        {
          request: {
            query: CreateRecipeDocument,
            variables: {
              info: {
                type: "Recipe",
                ingredients: [],
                sections: [],
                labels: [],
                name: "Cider-braised chicken",
                externalUrl: null,
                yield: null,
                totalTime: null,
                calories: null,
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
          request: { query: RecipeLabelSuggestionsDocument },
          maxUsageCount: 2,
          result: { data: { labels: { __typename: "LabelsQuery", all: [] } } },
        },
        {
          request: {
            query: CreateRecipeDocument,
            variables: {
              info: {
                type: "Recipe",
                ingredients: [],
                sections: [],
                labels: [],
                name: "Cider-braised chicken",
                externalUrl: null,
                yield: null,
                totalTime: null,
                calories: null,
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

describe("recipe labels in the create flow", () => {
  it("loads existing labels and saves selected and new labels, then invalidates suggestions", async () => {
    const user = userEvent.setup();
    const cache = buildInMemoryCache();
    const onCreated = vi.fn(() => {
      expect(cache.extract().ROOT_QUERY?.labels).toBeUndefined();
    });
    render(<CreateRecipeForm onCreated={onCreated} onCancel={vi.fn()} />, {
      cache,
      mocks: [
        {
          request: { query: RecipeLabelSuggestionsDocument },
          maxUsageCount: 2,
          result: {
            data: {
              labels: {
                __typename: "LabelsQuery",
                all: [
                  { __typename: "Label", id: "vegetarian", name: "Vegetarian" },
                ],
              },
            },
          },
        },
        successfulCreateMock({
          name: "Lentil soup",
          externalUrl: null,
          yield: null,
          totalTime: null,
          calories: null,
          directions: "",
          labels: ["Vegetarian", "Lunch-Dinner"],
        }),
      ],
    });
    await user.type(
      screen.getByRole("textbox", { name: "Title" }),
      "Lentil soup",
    );
    await user.click(screen.getByRole("button", { name: /Recipe labels/ }));
    const labelInput = screen.getByRole("searchbox", {
      name: "Search recipe labels",
    });
    await user.type(labelInput, "veg");
    await user.click(await screen.findByRole("option", { name: "Vegetarian" }));
    await user.type(labelInput, "Lunch//Dinner{ArrowDown}{Enter}{Escape}");
    await user.click(screen.getByRole("button", { name: "Save recipe" }));
    await waitFor(() =>
      expect(onCreated).toHaveBeenCalledWith(CREATED_RECIPE_ID),
    );
  });

  it("retries a failed suggestion query and makes the returned labels selectable", async () => {
    const user = userEvent.setup();
    render(<CreateRecipeForm onCreated={vi.fn()} onCancel={vi.fn()} />, {
      mocks: [
        {
          request: { query: RecipeLabelSuggestionsDocument },
          error: new Error("Offline"),
        },
        {
          request: { query: RecipeLabelSuggestionsDocument },
          maxUsageCount: 2,
          result: {
            data: {
              labels: {
                __typename: "LabelsQuery",
                all: [
                  { __typename: "Label", id: "weeknight", name: "Weeknight" },
                ],
              },
            },
          },
        },
      ],
    });
    await user.click(
      await screen.findByRole("button", { name: "Retry label suggestions" }),
    );
    await user.click(screen.getByRole("button", { name: /Recipe labels/ }));
    await user.type(
      screen.getByRole("searchbox", { name: "Search recipe labels" }),
      "week",
    );
    await user.click(await screen.findByRole("option", { name: "Weeknight" }));
    await user.keyboard("{Escape}");
    expect(screen.getByRole("row", { name: "Weeknight" })).toBeVisible();
  });
});
