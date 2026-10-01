import { LibrarySearchScope } from "@/__generated__/graphql";
import { ErrorFallback } from "@/components/error-fallback";
import { DeleteRecipeDocument } from "@/features/recipe-form/__generated__/deleteRecipe.generated";
import {
  GetRecipeGridDocument,
  type GetRecipeGridQuery,
} from "@/features/recipe-grid/__generated__/getRecipeGrid.generated";
import {
  act,
  buildInMemoryCache,
  render,
  screen,
  userEvent,
  within,
} from "@/test";
import type { Unmasked } from "@apollo/client";
import { useSuspenseQuery } from "@apollo/client/react";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { expect, it, vi } from "vitest";
import { GetRecipeDetailDocument } from "./__generated__/getRecipeDetail.generated";
import { RecipeDetail } from "./index";
import { recipe } from "./test/recipe";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, back: vi.fn(), push: vi.fn() }),
}));
const variables = {
  query: "",
  scope: LibrarySearchScope.MINE,
  activePlanId: "7",
};
const emptyGrid = {
  library: {
    __typename: "LibraryQuery",
    recipes: {
      __typename: "RecipeConnection",
      edges: [],
      pageInfo: { __typename: "PageInfo", hasNextPage: false, endCursor: null },
    },
  },
  planner: {
    __typename: "PlannerQuery",
    plan: { __typename: "Plan", id: "7", name: "Dinner" },
  },
} satisfies Unmasked<GetRecipeGridQuery>;

// Subscribe to the real grid query; rendering cards is irrelevant to cache broadcasts.
function LibraryObserver() {
  const { data } = useSuspenseQuery(GetRecipeGridDocument, { variables });
  return <p>{data.library.recipes.edges.length} library recipes</p>;
}
function Page({ closed = false }: { closed?: boolean }) {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense fallback={<p>Loading library</p>}>
        <LibraryObserver />
      </Suspense>
      <Suspense fallback={<p>Loading recipe</p>}>
        {closed ? (
          <p>Returned to library</p>
        ) : (
          <RecipeDetail id="pie" inScreen />
        )}
      </Suspense>
    </ErrorBoundary>
  );
}

it("keeps deletion safe when the library refreshes before navigation finishes", async () => {
  const user = userEvent.setup();
  const deletedDetailRequest = vi.fn(() => ({
    errors: [{ message: "There is no recipe with id pie" }],
  }));
  replace.mockReset();
  const cache = buildInMemoryCache();
  cache.writeQuery({
    query: GetRecipeGridDocument,
    variables,
    data: {
      ...emptyGrid,
      library: {
        ...emptyGrid.library,
        recipes: {
          ...emptyGrid.library.recipes,
          edges: [
            {
              __typename: "RecipeConnectionEdge",
              cursor: "pie",
              node: { ...recipe, favorite: false, plannedHistory: [] },
            },
          ],
        },
      },
    },
  });
  cache.writeQuery({
    query: GetRecipeDetailDocument,
    variables: { id: "pie" },
    data: { library: { __typename: "LibraryQuery", getRecipeById: recipe } },
  });
  const { rerender } = render(<Page />, {
    cache,
    mocks: [
      {
        request: { query: DeleteRecipeDocument, variables: { id: "pie" } },
        delay: 0,
        result: {
          data: {
            library: {
              __typename: "LibraryMutation",
              deleteRecipe: { __typename: "Deletion", id: "pie" },
            },
          },
        },
      },
      {
        request: { query: GetRecipeGridDocument, variables },
        delay: 0,
        result: { data: emptyGrid },
      },
      {
        request: { query: GetRecipeDetailDocument, variables: { id: "pie" } },
        delay: 0,
        result: deletedDetailRequest,
      },
    ],
  });
  await user.click(screen.getByRole("button", { name: "More recipe actions" }));
  await user.click(screen.getByRole("menuitem", { name: "Delete recipe" }));
  const dialog = screen.getByRole("alertdialog");
  await user.click(
    within(dialog).getByRole("button", { name: "Delete recipe" }),
  );
  // Keep the route mounted through both server responses and cache broadcasts.
  // router.replace requests navigation; it does not synchronously unmount the drawer.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
  });
  expect(replace).toHaveBeenCalledWith("/recipes");
  expect(screen.getByText("0 library recipes")).toBeVisible();
  expect(screen.queryByText("Something went wrong:")).not.toBeInTheDocument();
  expect(deletedDetailRequest).not.toHaveBeenCalled();
  rerender(<Page closed />);
  expect(screen.getByText("Returned to library")).toBeVisible();
});
