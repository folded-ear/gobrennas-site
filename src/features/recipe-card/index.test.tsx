import { DoSendToPlanDocument } from "@/features/send-to-plan/__generated__/doSendToPlan.generated";
import { SendToPlanFragmentDoc } from "@/features/send-to-plan/__generated__/sendToPlan.generated";
import { PreferenceValueFragmentDoc } from "@/hooks/use-preference/__generated__/preferenceValue.generated";
import { PREF_ACTIVE_PLAN } from "@/lib/preferences";
import {
  buildInMemoryCache,
  render,
  screen,
  seedFragment,
  userEvent,
} from "@/test";
import type { MockLink } from "@apollo/client/testing";
import { describe, expect, it, vi } from "vitest";
import { RecipeCardFragmentDoc } from "./__generated__/recipeCard.generated";
import { RecipeCard } from "./index";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

function show(doneAt?: string, mocks: MockLink.MockedResponse[] = []) {
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
  render(<RecipeCard recipe={recipe} />, { cache, mocks });
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

  it.each([false, true])(
    "keeps the card and cooking history visible after adding to a plan (cooked: %s)",
    async (cooked) => {
      const user = userEvent.setup();
      show(cooked ? new Date().toISOString() : undefined, [
        {
          request: {
            query: DoSendToPlanDocument,
            variables: { recipeId: "soup", planId: "week" },
          },
          result: {
            data: {
              library: {
                __typename: "LibraryMutation",
                sendRecipeToPlan: {
                  __typename: "PlanItem",
                  id: "planned-soup",
                },
              },
            },
          },
        },
      ]);

      await user.click(screen.getByRole("button", { name: "Our Week" }));

      expect(await screen.findByText("Added to Our Week")).toBeVisible();
      expect(screen.getByRole("link", { name: "Lentil soup" })).toBeVisible();
      expect(
        screen.getByText(cooked ? "Last cooked today" : "Never cooked"),
      ).toBeVisible();
      expect(screen.getByRole("button", { name: "Our Week" })).toBeEnabled();
    },
  );
});
