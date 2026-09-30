import {
  soupPhoto,
  stubPhotoBrowser,
} from "@/features/recipe-photo-editor/test/browser";
import {
  act,
  buildInMemoryCache,
  cleanup,
  render,
  screen,
  userEvent,
  waitFor,
} from "@/test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GetRecipeForEditDocument } from "./__generated__/getRecipeForEdit.generated";
import { RecipeLabelSuggestionsDocument } from "./__generated__/recipeLabelSuggestions.generated";
import { RecipePhotoUploadDocument } from "./__generated__/recipePhotoUpload.generated";
import { RecognizeIngredientDocument } from "./__generated__/recognizeIngredient.generated";
import { UpdateRecipeDocument } from "./__generated__/updateRecipe.generated";
import { EditRecipeForm } from "./edit-recipe-form";
import { storedInfo, storedRecipe } from "./test/edit-recipe";

const query = { query: GetRecipeForEditDocument, variables: { id: "pie" } };
const load = {
  request: query,
  result: {
    data: {
      library: { __typename: "LibraryQuery", getRecipeById: storedRecipe },
    },
  },
};
const labels = {
  maxUsageCount: Infinity,
  request: { query: RecipeLabelSuggestionsDocument },
  result: { data: { labels: { __typename: "LabelsQuery", all: [] } } },
};
const recognitionMocks = [
  ...storedRecipe.ingredients,
  ...storedRecipe.sections[0].ingredients,
].map(({ raw }) => ({
  maxUsageCount: Infinity,
  request: {
    query: RecognizeIngredientDocument,
    variables: { raw, cursor: raw.length, choice: null, suggest: false },
  },
  result: {
    data: {
      library: {
        __typename: "LibraryQuery",
        recognizeItem: {
          raw,
          cursor: raw.length,
          ranges: [],
        },
      },
    },
  },
}));
const success = {
  data: {
    library: {
      __typename: "LibraryMutation",
      updateRecipe: { __typename: "Recipe", id: "pie" },
    },
  },
};
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("editing owned recipes", () => {
  it("loads the form and saves a title change without losing ingredient data, section labels, references, or photo", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    const cache = buildInMemoryCache();
    cache.writeQuery({ ...query, data: load.result.data });
    const evict = vi.spyOn(cache, "evict");
    render(<EditRecipeForm id="pie" onSaved={onSaved} onCancel={() => {}} />, {
      cache,
      mocks: [
        load,
        labels,
        ...recognitionMocks,
        {
          request: {
            query: UpdateRecipeDocument,
            variables: {
              id: "pie",
              info: { ...storedInfo, name: "Better pie" },
            },
          },
          result: success,
        },
      ],
    });
    const title = await screen.findByRole("textbox", { name: "Title" });
    expect(title).toHaveValue("Apple pie");
    expect(
      screen.getByRole("textbox", { name: "Total cook time" }),
    ).toHaveValue("80");
    expect(
      screen.getByRole("link", { name: "Borrowed topping" }),
    ).toHaveAttribute("href", "/recipes/other-recipe");
    expect(
      screen.queryByRole("textbox", { name: "Section 2 title" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Hidden section label")).not.toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Selected recipe photo" }),
    ).toHaveAttribute("src", storedRecipe.photo?.url);
    await user.clear(title);
    await user.type(title, "Better pie");
    await user.click(screen.getByRole("button", { name: "Save recipe" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("pie"));
    expect(evict).toHaveBeenCalledWith({ id: "Ingredient:pie" });
    expect(evict).toHaveBeenCalledWith({ id: "Ingredient:crust" });
    expect(evict).toHaveBeenCalledWith({
      id: "ROOT_QUERY",
      fieldName: "library",
    });
    expect(evict).not.toHaveBeenCalledWith({ id: "Ingredient:topping" });
  });

  it("preserves focus edits and the draft after failure, retries without reuploading the existing photo", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    const cache = buildInMemoryCache();
    const evict = vi.spyOn(cache, "evict");
    const request = {
      query: UpdateRecipeDocument,
      variables: {
        id: "pie",
        info: { ...storedInfo, photoFocus: [0.21000000000000002, 0.8] },
      },
    };
    render(<EditRecipeForm id="pie" onSaved={onSaved} onCancel={() => {}} />, {
      cache,
      mocks: [
        load,
        labels,
        ...recognitionMocks,
        { request, error: new Error("Offline") },
        { request, result: success },
      ],
    });
    await screen.findByRole("textbox", { name: "Title" });
    screen.getByRole("button", { name: "Photo focus" }).focus();
    await user.keyboard("{ArrowRight}");
    await user.click(screen.getByRole("button", { name: "Save recipe" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn’t save recipe",
    );
    expect(screen.getByRole("textbox", { name: "Title" })).toHaveValue(
      "Apple pie",
    );
    expect(
      screen.queryByRole("button", { name: "Retry photo upload" }),
    ).not.toBeInTheDocument();
    expect(evict).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Save recipe" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("pie"));
  });

  it.each([true, false])(
    "handles an uploaded replacement (discard: %s)",
    async (discard) => {
      const user = userEvent.setup();
      const browser = stubPhotoBrowser();
      const onSaved = vi.fn();
      render(
        <EditRecipeForm id="pie" onSaved={onSaved} onCancel={() => {}} />,
        {
          mocks: [
            load,
            labels,
            ...recognitionMocks,
            {
              request: {
                query: RecipePhotoUploadDocument,
                variables: {
                  contentType: "image/jpeg",
                  originalFilename: "soup.jpg",
                },
              },
              result: {
                data: {
                  profile: {
                    __typename: "ProfileQuery",
                    scratchFile: {
                      __typename: "ScratchUpload",
                      filename: "scratch/soup.jpg",
                      url: "https://photos.example.test/upload",
                      contentType: "image/jpeg",
                      cacheControl: "max-age=1",
                    },
                  },
                },
              },
            },
            {
              request: {
                query: UpdateRecipeDocument,
                variables: {
                  id: "pie",
                  info: discard
                    ? storedInfo
                    : {
                        ...storedInfo,
                        photo: "scratch/soup.jpg",
                        photoFocus: [0.5, 0.5],
                      },
                },
              },
              result: success,
            },
          ],
        },
      );
      await screen.findByRole("textbox", { name: "Title" });
      await user.upload(screen.getByLabelText("Recipe photo"), soupPhoto());
      await waitFor(() => expect(browser.requests).toHaveLength(1));
      act(() => browser.requests[0].respond());
      if (discard) {
        await user.click(
          screen.getByRole("button", { name: "Discard replacement" }),
        );
        expect(
          screen.getByRole("img", { name: "Selected recipe photo" }),
        ).toHaveAttribute("src", storedRecipe.photo?.url);
        expect(
          screen.getByRole("img", { name: "Narrow crop preview" }),
        ).toHaveStyle({ objectPosition: "20% 80%" });
      }
      await user.click(screen.getByRole("button", { name: "Save recipe" }));
      await waitFor(() => expect(onSaved).toHaveBeenCalledWith("pie"));
      expect(browser.revokeObjectURL).not.toHaveBeenCalledWith(
        storedRecipe.photo?.url,
      );
    },
  );

  it("does not offer an editable form to a non-owner", async () => {
    render(<EditRecipeForm id="pie" onSaved={vi.fn()} onCancel={vi.fn()} />, {
      mocks: [
        {
          ...load,
          result: {
            data: {
              library: {
                __typename: "LibraryQuery",
                getRecipeById: { ...storedRecipe, mine: false },
              },
            },
          },
        },
      ],
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "only its owner",
    );
    expect(
      screen.queryByRole("textbox", { name: "Title" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Save recipe" }),
    ).not.toBeInTheDocument();
  });

  it("offers retry for a load failure and cancels without saving", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onSaved = vi.fn();
    render(<EditRecipeForm id="pie" onSaved={onSaved} onCancel={onCancel} />, {
      mocks: [
        { request: query, error: new Error("Offline") },
        load,
        labels,
        ...recognitionMocks,
      ],
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn’t load recipe",
    );
    await user.click(screen.getByRole("button", { name: "Retry" }));
    const title = await screen.findByRole("textbox", { name: "Title" });
    await user.type(title, " changed");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onSaved).not.toHaveBeenCalled();
  });
});
