import { RecipePhotoUploadDocument } from "@/lib/recipe-photo/__generated__/recipePhotoUpload.generated";
import { soupPhoto, stubPhotoBrowser } from "@/lib/recipe-photo/test/browser";
import { RecipeEdit } from "@/screens/recipe-edit";
import {
  act,
  buildInMemoryCache,
  cleanup,
  render,
  screen,
  userEvent,
  waitFor,
  within,
} from "@/test";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CreateRecipeFromDocument } from "./__generated__/createRecipeFrom.generated";
import { DeleteRecipeDocument } from "./__generated__/deleteRecipe.generated";
import { GetRecipeForEditDocument } from "./__generated__/getRecipeForEdit.generated";
import { RecipeLabelSuggestionsDocument } from "./__generated__/recipeLabelSuggestions.generated";
import { RecognizeIngredientDocument } from "./__generated__/recognizeIngredient.generated";
import { UpdateRecipeDocument } from "./__generated__/updateRecipe.generated";
import { EditRecipeForm } from "./edit-recipe-form";
import { copiedInfo, storedInfo, storedRecipe } from "./test/edit-recipe";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

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
  vi.clearAllMocks();
});

describe("editing owned recipes", () => {
  it("loads the form and saves a title change without losing ingredient data, section labels, references, or photo", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    const cache = buildInMemoryCache();
    cache.writeQuery({ ...query, data: load.result.data });
    const evict = vi.spyOn(cache, "evict");
    render(
      <EditRecipeForm
        onDeleted={vi.fn()}
        id="pie"
        onSaved={onSaved}
        onCancel={() => {}}
      />,
      {
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
      },
    );
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
    render(
      <EditRecipeForm
        onDeleted={vi.fn()}
        id="pie"
        onSaved={onSaved}
        onCancel={() => {}}
      />,
      {
        cache,
        mocks: [
          load,
          labels,
          ...recognitionMocks,
          { request, error: new Error("Offline") },
          { request, result: success },
        ],
      },
    );
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
        <EditRecipeForm
          onDeleted={vi.fn()}
          id="pie"
          onSaved={onSaved}
          onCancel={() => {}}
        />,
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

  it("offers retry for a load failure and cancels without saving", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onSaved = vi.fn();
    render(
      <EditRecipeForm
        onDeleted={vi.fn()}
        id="pie"
        onSaved={onSaved}
        onCancel={onCancel}
      />,
      {
        mocks: [
          { request: query, error: new Error("Offline") },
          load,
          labels,
          ...recognitionMocks,
        ],
      },
    );
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

const deletionRequest = {
  query: DeleteRecipeDocument,
  variables: { id: "pie" },
};
const deletionResult = {
  data: {
    library: {
      __typename: "LibraryMutation",
      deleteRecipe: { __typename: "Deletion", id: "pie" },
    },
  },
};

// Observe the real normalized cache and a mounted library query, as happens
// when the editor is open over the library.
const libraryQuery = gql`
  query DeleteTestLibrary {
    library {
      recipes(scope: MINE, query: "", first: 12) {
        edges {
          node {
            id
            name
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;
function libraryResult(deleted = false) {
  return {
    library: {
      __typename: "LibraryQuery",
      recipes: {
        __typename: "RecipeConnection",
        edges: (deleted
          ? []
          : [{ __typename: "Recipe", id: "pie", name: "Apple pie" }]
        ).map((node) => ({ __typename: "RecipeEdge", node })),
        pageInfo: {
          __typename: "PageInfo",
          hasNextPage: false,
          endCursor: null,
        },
      },
    },
  };
}
function LibraryProbe() {
  const { data, loading } = useQuery<{
    library: { recipes: { edges: { node: { name: string } }[] } };
  }>(libraryQuery);
  return (
    <output aria-label="Library recipes">
      {loading
        ? "Refreshing"
        : data?.library.recipes.edges
            .map((edge) => edge.node.name)
            .join(", ") || "No recipes"}
    </output>
  );
}

describe("deleting owned recipes", () => {
  it.each(["button", "Escape"])(
    "cancels via %s without deleting, submitting, or losing edits and restores focus",
    async (method) => {
      const user = userEvent.setup();
      const onDeleted = vi.fn();
      const onSaved = vi.fn();
      const deleted = vi.fn(() => deletionResult);
      render(
        <EditRecipeForm
          id="pie"
          onSaved={onSaved}
          onCancel={vi.fn()}
          onDeleted={onDeleted}
        />,
        {
          mocks: [
            load,
            labels,
            ...recognitionMocks,
            { request: deletionRequest, result: deleted },
          ],
        },
      );
      const title = await screen.findByRole("textbox", { name: "Title" });
      await user.type(title, " unsaved");
      const trigger = screen.getByRole("button", { name: "Delete recipe" });
      await user.click(trigger);
      const dialog = await screen.findByRole("alertdialog", {
        name: "Delete “Apple pie”?",
      });
      const cancel = within(dialog).getByRole("button", { name: "Cancel" });
      await waitFor(() => expect(cancel).toHaveFocus());
      if (method === "button") await user.click(cancel);
      else await user.keyboard("{Escape}");
      await waitFor(() =>
        expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
      );
      await waitFor(() => expect(trigger).toHaveFocus());
      expect(title).toHaveValue("Apple pie unsaved");
      expect(deleted).not.toHaveBeenCalled();
      expect(onSaved).not.toHaveBeenCalled();
      expect(onDeleted).not.toHaveBeenCalled();
    },
  );

  it.each(["network", "invalid response"])(
    "retains the draft and cache after %s failure and allows retry",
    async (failure) => {
      const user = userEvent.setup();
      const onDeleted = vi.fn();
      const cache = buildInMemoryCache();
      cache.writeQuery({ ...query, data: load.result.data });
      const failed =
        failure === "network"
          ? { request: deletionRequest, error: new Error("Offline") }
          : {
              request: deletionRequest,
              result: {
                data: {
                  library: {
                    __typename: "LibraryMutation",
                    deleteRecipe: { __typename: "Deletion", id: "wrong" },
                  },
                },
              },
            };
      render(
        <EditRecipeForm
          id="pie"
          onSaved={vi.fn()}
          onCancel={vi.fn()}
          onDeleted={onDeleted}
        />,
        {
          cache,
          mocks: [
            load,
            labels,
            ...recognitionMocks,
            failed,
            { request: deletionRequest, result: deletionResult },
          ],
        },
      );
      const title = await screen.findByRole("textbox", { name: "Title" });
      await user.type(title, " unsaved");
      await user.click(screen.getByRole("button", { name: "Delete recipe" }));
      let dialog = await screen.findByRole("alertdialog");
      await user.click(
        within(dialog).getByRole("button", { name: "Delete recipe" }),
      );
      expect(await within(dialog).findByRole("alert")).toHaveTextContent(
        "Couldn’t delete recipe",
      );
      expect(onDeleted).not.toHaveBeenCalled();
      expect(cache.readQuery(query)).toEqual(load.result.data);
      await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
      await waitFor(() =>
        expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
      );
      expect(title).toHaveValue("Apple pie unsaved");
      await user.click(screen.getByRole("button", { name: "Delete recipe" }));
      dialog = await screen.findByRole("alertdialog");
      expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
      await user.click(
        within(dialog).getByRole("button", { name: "Delete recipe" }),
      );
      await waitFor(() => expect(onDeleted).toHaveBeenCalledOnce());
    },
  );

  it("confirms once, refreshes the mounted library and affected plan links, and navigates back to the library", async () => {
    const user = userEvent.setup();
    const cache = buildInMemoryCache();
    cache.writeQuery({ ...query, data: load.result.data });
    cache.writeQuery({ query: libraryQuery, data: libraryResult() });
    cache.restore({
      ...cache.extract(),
      "PlanItem:dinner": {
        __typename: "PlanItem",
        id: "dinner",
        ingredient: { __ref: "Ingredient:pie" },
        notes: null,
        pendingName: "Dinner unsaved",
      },
      "PlanItem:section": {
        __typename: "PlanItem",
        id: "section",
        ingredient: { __ref: "Ingredient:crust" },
        notes: null,
      },
      "PlanItem:other": {
        __typename: "PlanItem",
        id: "other",
        ingredient: { __ref: "Ingredient:topping" },
        notes: "Keep me",
      },
    });
    const deleted = vi.fn(() => deletionResult);
    render(
      <>
        <LibraryProbe />
        <RecipeEdit id="pie" />
      </>,
      {
        cache,
        mocks: [
          load,
          labels,
          ...recognitionMocks,
          { request: deletionRequest, result: deleted, delay: 250 },
          {
            request: { query: libraryQuery },
            result: { data: libraryResult(true) },
          },
        ],
      },
    );
    await screen.findByRole("textbox", { name: "Title" });
    expect(screen.getByLabelText("Library recipes")).toHaveTextContent(
      "Apple pie",
    );
    await user.click(screen.getByRole("button", { name: "Delete recipe" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.dblClick(
      within(dialog).getByRole("button", { name: "Delete recipe" }),
    );
    expect(
      within(dialog).getByRole("button", { name: "Cancel" }),
    ).toBeDisabled();
    expect(
      within(dialog).getByRole("button", { name: /Deleting/ }),
    ).toBeDisabled();
    await user.keyboard("{Escape}");
    expect(dialog).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(replace).toHaveBeenCalledExactlyOnceWith("/recipes"),
    );
    expect(deleted).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(screen.getByLabelText("Library recipes")).toHaveTextContent(
        "No recipes",
      ),
    );
    const state = cache.extract();
    expect(state["Ingredient:pie"]).toBeUndefined();
    expect(state["Ingredient:crust"]).toBeUndefined();
    expect(state["Ingredient:topping"]).toMatchObject({ id: "topping" });
    expect(state["PlanItem:dinner"]).toEqual({
      __typename: "PlanItem",
      id: "dinner",
      pendingName: "Dinner unsaved",
    });
    expect(state["PlanItem:section"]).toEqual({
      __typename: "PlanItem",
      id: "section",
    });
    expect(state["PlanItem:other"]).toEqual({
      __typename: "PlanItem",
      id: "other",
      ingredient: { __ref: "Ingredient:topping" },
      notes: "Keep me",
    });
  });
});

describe("copying recipes", () => {
  it.each([
    { mine: true, copy: true, button: "Save copy" },
    { mine: true, copy: false, button: "Save as copy" },
    { mine: false, copy: false, button: "Save copy" },
  ])(
    "copies from $button (mine: $mine, copy: $copy) with the current draft",
    async ({ mine, copy, button }) => {
      const cache = buildInMemoryCache();
      cache.writeQuery({ ...query, data: load.result.data });
      const evict = vi.spyOn(cache, "evict");
      const result = vi.fn(() => ({
        data: {
          library: {
            __typename: "LibraryMutation",
            createRecipeFrom: { __typename: "Recipe", id: "new-pie" },
          },
        },
      }));
      render(<RecipeEdit id="pie" copy={copy} />, {
        cache,
        mocks: [
          {
            ...load,
            result: {
              data: {
                library: {
                  __typename: "LibraryQuery",
                  getRecipeById: { ...storedRecipe, mine },
                },
              },
            },
          },
          labels,
          ...recognitionMocks,
          {
            request: {
              query: CreateRecipeFromDocument,
              variables: {
                sourceRecipeId: "pie",
                info: {
                  ...copiedInfo,
                  name: "My pie",
                  sections: [
                    {
                      ...copiedInfo.sections![0],
                      directions: "Chill the pastry.",
                    },
                    copiedInfo.sections![1],
                  ],
                },
              },
            },
            delay: 40,
            result,
          },
        ],
      });
      const title = await screen.findByRole("textbox", { name: "Title" });
      expect(
        screen.getByRole("img", { name: "Selected recipe photo" }),
      ).toHaveAttribute("src", storedRecipe.photo!.url);
      expect(
        screen.getByRole("link", { name: "Borrowed topping" }),
      ).toHaveAttribute("href", "/recipes/other-recipe");
      if (copy || !mine) {
        expect(
          screen.getByRole("heading", { name: "Copy Recipe" }),
        ).toBeInTheDocument();
        expect(
          screen.queryByRole("button", { name: "Save recipe" }),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByRole("button", { name: "Delete recipe" }),
        ).not.toBeInTheDocument();
      }
      await userEvent.clear(title);
      await userEvent.type(title, "My pie");
      await userEvent.type(
        screen.getByRole("textbox", { name: "Section 1 directions" }),
        "Chill the pastry.",
      );
      await userEvent.dblClick(screen.getByRole("button", { name: button }));
      await waitFor(() =>
        expect(replace).toHaveBeenCalledWith("/recipes/new-pie"),
      );
      expect(result).toHaveBeenCalledOnce();
      expect(evict).toHaveBeenCalledWith({
        id: "ROOT_QUERY",
        fieldName: "library",
      });
      expect(evict).toHaveBeenCalledWith({
        id: "ROOT_QUERY",
        fieldName: "labels",
      });
      expect(evict).not.toHaveBeenCalledWith({ id: "Ingredient:pie" });
      expect(evict).not.toHaveBeenCalledWith({ id: "Ingredient:crust" });
    },
  );

  it.each(["network", "missing id", "source id"])(
    "preserves the draft after %s failure and permits retry",
    async (failure) => {
      const request = {
        query: CreateRecipeFromDocument,
        variables: { sourceRecipeId: "pie", info: copiedInfo },
      };
      const cache = buildInMemoryCache();
      const evict = vi.spyOn(cache, "evict");
      const reply = (id: string) => ({
        data: {
          library: {
            __typename: "LibraryMutation",
            createRecipeFrom: { __typename: "Recipe", id },
          },
        },
      });
      render(<RecipeEdit id="pie" copy />, {
        cache,
        mocks: [
          load,
          labels,
          ...recognitionMocks,
          failure === "network"
            ? { request, error: new Error("Offline") }
            : { request, result: reply(failure === "source id" ? "pie" : "") },
          { request, result: reply("new-pie") },
        ],
      });
      await screen.findByRole("textbox", { name: "Title" });
      await userEvent.click(screen.getByRole("button", { name: "Save copy" }));
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Couldn’t save recipe",
      );
      expect(screen.getByRole("textbox", { name: "Title" })).toHaveValue(
        "Apple pie",
      );
      expect(replace).not.toHaveBeenCalled();
      expect(evict).not.toHaveBeenCalled();
      await userEvent.click(screen.getByRole("button", { name: "Save copy" }));
      await waitFor(() =>
        expect(replace).toHaveBeenCalledWith("/recipes/new-pie"),
      );
    },
  );

  it("validates a copy and cancels back to the source without saving", async () => {
    render(<RecipeEdit id="pie" copy />, {
      mocks: [load, labels, ...recognitionMocks],
    });
    await screen.findByRole("textbox", { name: "Title" });
    await userEvent.clear(
      screen.getByRole("textbox", { name: "Section 1 title" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Save copy" }));
    expect(
      await screen.findByText("A section title is required."),
    ).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(replace).toHaveBeenCalledWith("/recipes/pie");
  });
});
