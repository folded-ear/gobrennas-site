import { LibrarySearchScope } from "@/__generated__/graphql";
import { GetRecipeGridDocument } from "@/features/recipe-grid/__generated__/getRecipeGrid.generated";
import { PreferenceValueFragmentDoc } from "@/hooks/use-preference/__generated__/preferenceValue.generated";
import { PREF_ACTIVE_PLAN } from "@/lib/preferences";
import { buildInMemoryCache, render, screen } from "@/test";
import { describe, expect, it } from "vitest";
import { RecipesDocument } from "./__generated__/recipes.generated";
import { Recipes } from "./recipes";

const ACTIVE_PLAN = {
  __typename: "Plan" as const,
  id: "plan-weeknights",
  name: "Weeknights",
  color: "#f5cd06",
  mine: true,
};
const SHARED_PLAN = {
  __typename: "Plan" as const,
  id: "plan-neighbor",
  name: "Neighbor plan",
  color: "#9cb7da",
  mine: false,
};

function renderRecipes(): void {
  const cache = buildInMemoryCache();
  cache.writeQuery({
    query: RecipesDocument,
    data: {
      planner: {
        __typename: "PlannerQuery",
        plans: [ACTIVE_PLAN, SHARED_PLAN],
      },
    },
  });
  cache.writeQuery({
    query: GetRecipeGridDocument,
    variables: {
      query: "",
      scope: LibrarySearchScope.MINE,
      activePlanId: ACTIVE_PLAN.id,
    },
    data: {
      library: {
        __typename: "LibraryQuery",
        recipes: {
          __typename: "RecipeConnection",
          edges: [],
          pageInfo: {
            __typename: "PageInfo",
            hasNextPage: false,
            endCursor: null,
          },
        },
      },
      planner: {
        __typename: "PlannerQuery",
        plan: {
          __typename: "Plan",
          id: ACTIVE_PLAN.id,
          name: ACTIVE_PLAN.name,
        },
      },
    },
  });
  cache.writeFragment({
    id: cache.identify({
      __typename: "UserPreference",
      name: PREF_ACTIVE_PLAN,
    }),
    fragment: PreferenceValueFragmentDoc,
    data: { __typename: "UserPreference", value: ACTIVE_PLAN.id },
  });

  render(<Recipes />, { cache });
}

describe("Recipes", () => {
  it("offers Add Recipe as a link while the Library data flow renders", () => {
    renderRecipes();

    expect(screen.getByRole("link", { name: "Add Recipe" })).toHaveAttribute(
      "href",
      "/recipes/new",
    );
    expect(screen.getByRole("button", { name: /plan/i })).toBeVisible();
    expect(
      screen.getByRole("searchbox", { name: "Search recipes" }),
    ).toBeVisible();
    expect(screen.getByText("fin.")).toBeVisible();
  });
});
