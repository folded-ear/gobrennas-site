import { DeleteRecipeDocument } from "@/features/recipe-form/__generated__/deleteRecipe.generated";
import {
  act,
  buildInMemoryCache,
  render,
  screen,
  userEvent,
  waitFor,
  within,
} from "@/test";
import { Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GetRecipeDetailDocument } from "./__generated__/getRecipeDetail.generated";
import { RecipeDetail } from "./index";
import { recipe } from "./test/recipe";

const replace = vi.fn();
const back = vi.fn();
const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, back, push }),
}));
beforeEach(() => {
  replace.mockReset();
  back.mockReset();
  push.mockReset();
});

const query = { query: GetRecipeDetailDocument, variables: { id: "pie" } };
const deletion = { query: DeleteRecipeDocument, variables: { id: "pie" } };

function show(
  value = recipe,
  mocks: Parameters<typeof render>[1] = {},
  inScreen = false,
) {
  const cache = buildInMemoryCache();
  cache.writeQuery({
    ...query,
    data: { library: { __typename: "LibraryQuery", getRecipeById: value } },
  });
  return {
    cache,
    ...render(
      <Suspense>
        <RecipeDetail id="pie" inScreen={inScreen} />
      </Suspense>,
      { cache, ...mocks },
    ),
  };
}

describe("RecipeDetail", () => {
  it("shows the saved recipe and each section without requiring an active plan", async () => {
    show();
    expect(
      screen.getByRole("heading", { name: "Apple pie", level: 1 }),
    ).toBeVisible();
    expect(screen.getByText("2")).toHaveClass("morsel-quantity");
    expect(screen.getByText("apples")).toHaveClass("morsel-ingredient");
    expect(screen.getAllByText("cup")).toHaveLength(2);
    expect(screen.getByText("pinch of mystery spice")).toBeVisible();
    expect(screen.getByText("½")).toHaveClass("morsel-quantity");
    expect(screen.getByText("sugar")).toHaveClass("morsel-ingredient");
    expect(
      screen.getAllByRole("listitem").map((item) => item.textContent),
    ).toContain("½ cup sugar, divided");
    expect(screen.getByText(/Bake until golden/).textContent).toBe(
      recipe.directions,
    );
    expect(
      within(screen.getByRole("region", { name: "Crust" })).getByText(
        "Chill the dough.",
      ),
    ).toBeVisible();
    expect(
      within(screen.getByRole("region", { name: "Whipped cream" })).getByText(
        "Whip to soft peaks.",
      ),
    ).toBeVisible();
    expect(screen.getByText("8 servings")).toBeVisible();
    expect(screen.getByText("1 hr 20 min")).toBeVisible();
    expect(screen.getByText("0")).toBeVisible();
    expect(
      screen.getByRole("list", { name: "Recipe labels" }),
    ).toHaveTextContent("Dessert");
    expect(
      screen.getByRole("link", { name: "https://example.test/pie" }),
    ).toHaveAttribute("href", "https://example.test/pie");
    await userEvent.click(
      screen.getByRole("button", { name: "More recipe actions" }),
    );
    expect(
      screen.getByRole("menuitem", { name: "Delete recipe" }),
    ).toBeVisible();
    await userEvent.click(
      screen.getByRole("menuitem", { name: "Edit recipe" }),
    );
    expect(push).toHaveBeenCalledWith("/recipes/pie/edit");
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /send|cook/i }),
    ).not.toBeInTheDocument();
  });

  it("shows an incomplete recipe without edit or delete actions for another owner", () => {
    show({
      ...recipe,
      mine: false,
      ingredients: [],
      directions: null,
      sections: [],
      externalUrl: null,
      yield: null,
      totalTime: null,
      calories: null,
      labels: null,
    });
    expect(screen.getByText("No ingredients listed.")).toBeVisible();
    expect(screen.getByText("No directions provided.")).toBeVisible();
    expect(
      screen.queryByRole("link", { name: "Edit recipe" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Delete recipe" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Total time")).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("cancels deletion and returns focus to its trigger", async () => {
    const user = userEvent.setup();
    show();
    const trigger = screen.getByRole("button", { name: "More recipe actions" });
    await user.click(trigger);
    await user.click(screen.getByRole("menuitem", { name: "Delete recipe" }));
    const dialog = await screen.findByRole("alertdialog", {
      name: "Delete “Apple pie”?",
    });
    expect(
      within(dialog).getByRole("button", { name: "Cancel" }),
    ).toHaveFocus();
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(replace).not.toHaveBeenCalled();
  });

  it("closes a full-page recipe to the library", async () => {
    show();
    await userEvent.click(screen.getByRole("button", { name: "Close recipe" }));
    expect(replace).toHaveBeenCalledWith("/recipes");
  });

  it("keeps the drawer open when Escape dismisses deletion, then closes with its single close control", async () => {
    show(recipe, {}, true);
    const more = screen.getByRole("button", { name: "More recipe actions" });
    await userEvent.click(more);
    await userEvent.click(
      screen.getByRole("menuitem", { name: "Delete recipe" }),
    );
    await screen.findByRole("alertdialog");
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(back).not.toHaveBeenCalled();
    await waitFor(() => expect(more).toHaveFocus());
    expect(screen.getAllByRole("button", { name: /close/i })).toHaveLength(1);
    await userEvent.click(screen.getByRole("button", { name: "Close recipe" }));
    expect(back).toHaveBeenCalledTimes(1);
  });

  it("keeps a failed deletion readable and allows retry before returning to the library", async () => {
    const user = userEvent.setup();
    const { cache, unmount } = show(recipe, {
      mocks: [
        { request: deletion, error: new Error("Offline") },
        {
          request: deletion,
          result: {
            data: {
              library: {
                __typename: "LibraryMutation",
                deleteRecipe: { __typename: "Deletion", id: "pie" },
              },
            },
          },
        },
      ],
    });
    // Model the route leaving when the confirmed deletion succeeds.
    replace.mockImplementation(() => unmount());
    await user.click(
      screen.getByRole("button", { name: "More recipe actions" }),
    );
    await user.click(screen.getByRole("menuitem", { name: "Delete recipe" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(
      within(dialog).getByRole("button", { name: "Delete recipe" }),
    );
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "The recipe hasn’t been deleted.",
    );
    expect(cache.readQuery(query)).not.toBeNull();
    // A failed deletion must resume the detail query, not leave a frozen snapshot.
    act(() =>
      cache.writeQuery({
        ...query,
        data: {
          library: {
            __typename: "LibraryQuery",
            getRecipeById: { ...recipe, name: "Apple pie, revised" },
          },
        },
      }),
    );
    expect(
      await screen.findByRole("alertdialog", {
        name: "Delete “Apple pie, revised”?",
      }),
    ).toBeVisible();

    expect(replace).not.toHaveBeenCalled();
    await user.click(
      within(dialog).getByRole("button", { name: "Delete recipe" }),
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/recipes"));
    expect(cache.readQuery(query)).toBeNull();
  });
});
