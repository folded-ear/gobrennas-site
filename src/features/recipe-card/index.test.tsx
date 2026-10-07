import { SendToPlanFragmentDoc } from "@/features/send-to-plan/__generated__/sendToPlan.generated";
import { PreferenceValueFragmentDoc } from "@/hooks/use-preference/__generated__/preferenceValue.generated";
import { PREF_ACTIVE_PLAN } from "@/lib/preferences";
import { buildInMemoryCache, render, screen, seedFragment } from "@/test";
import { describe, expect, it, vi } from "vitest";
import { RecipeCardFragmentDoc } from "./__generated__/recipeCard.generated";
import { RecipeCard } from "./index";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

function show(doneAt?: string) {
  const cache = buildInMemoryCache();
  seedFragment(
    cache,
    PreferenceValueFragmentDoc,
    "preferenceValue",
    {
      __typename: "UserPreference",
      value: "week",
    },
    {
      id: cache.identify({
        __typename: "UserPreference",
        name: PREF_ACTIVE_PLAN,
      }),
    },
  );
  seedFragment(
    cache,
    SendToPlanFragmentDoc,
    "sendToPlan",
    {
      planner: {
        __typename: "PlannerQuery",
        plan: { __typename: "Plan", id: "week", name: "Our Week" },
      },
    },
    { id: "ROOT_QUERY", variables: { activePlanId: "week" } },
  );
  const recipe = seedFragment(cache, RecipeCardFragmentDoc, "recipeCard", {
    __typename: "Recipe",
    id: "soup",
    name: "Lentil soup",
    mine: true,
    photo: null,
    favorite: false,
    labels: [],
    ownedBy: null,
    plannedHistory: doneAt
      ? [{ __typename: "PlannedRecipeHistory", doneAt, ratingInt: null }]
      : [],
  });
  render(<RecipeCard recipe={recipe} />, { cache });
}

describe("recipe card cooking history", () => {
  it("shows Never cooked when there is no completed cooking history", () => {
    show();
    expect(screen.getByText("Never cooked")).toBeVisible();
  });

  it("shows the cooking date when a completed entry exists", () => {
    show(new Date().toISOString());
    expect(screen.getByText("Last cooked today")).toBeVisible();
    expect(screen.queryByText("Never cooked")).not.toBeInTheDocument();
  });
});
