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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
        plans: [
          {
            __typename: "Plan",
            id: "week",
            name: "Our Week",
            color: "#f5cd06",
            mine: true,
            grants: [],
          },
        ],
      },
    },
    { id: "ROOT_QUERY" },
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
      ? [{ __typename: "PlannedRecipeHistory", doneAt }]
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

  describe("names the day it was last cooked by the calendar", () => {
    // a Sunday afternoon, local time
    const now = new Date(2026, 10, 8, 15, 0);
    const at = (...local: [number, number, number, number, number]) =>
      new Date(...local).toISOString();

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(now);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it.each([
      ["earlier the same day", at(2026, 10, 8, 0, 5), "Last cooked today"],
      [
        "late the night before",
        at(2026, 10, 7, 23, 30),
        "Last cooked yesterday",
      ],
      ["ten days ago", at(2026, 9, 29, 12, 0), "Last cooked Thu, Oct 29"],
    ])("%s", (_, doneAt, label) => {
      show(doneAt);
      expect(screen.getByText(label)).toBeVisible();
    });
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
