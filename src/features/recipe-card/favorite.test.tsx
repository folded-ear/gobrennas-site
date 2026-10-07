import {
  buildInMemoryCache,
  render,
  screen,
  seedFragment,
  userEvent,
  waitFor,
} from "@/test";
import { MockLink } from "@apollo/client/testing";
import { describe, expect, it } from "vitest";
import {
  CardFavoriteFragmentDoc,
  MarkCardFavoriteDocument,
  MarkCardFavoriteMutation,
  RemoveCardFavoriteDocument,
  RemoveCardFavoriteMutation,
} from "./__generated__/cardFavorite.generated";
import { CardFavorite } from "./favorite";

const mark: MockLink.MockedResponse<MarkCardFavoriteMutation> = {
  request: { query: MarkCardFavoriteDocument, variables: { id: "soup" } },
  result: {
    data: {
      favorite: {
        __typename: "FavoriteMutation",
        markFavorite: { __typename: "Favorite", id: "favorite-soup" },
      },
    },
  },
};
const remove: MockLink.MockedResponse<RemoveCardFavoriteMutation> = {
  request: { query: RemoveCardFavoriteDocument, variables: { id: "soup" } },
  result: {
    data: {
      favorite: { __typename: "FavoriteMutation", removeFavorite: true },
    },
  },
};

function show(favorite: boolean, mocks: MockLink.MockedResponse[]) {
  const cache = buildInMemoryCache();
  const recipe = seedFragment(cache, CardFavoriteFragmentDoc, "cardFavorite", {
    __typename: "Recipe",
    id: "soup",
    name: "Lentil soup",
    favorite,
  });
  render(<CardFavorite recipe={recipe} />, { cache, mocks });
  return cache;
}

function button() {
  return screen.getByRole("button", { name: "Favorite: Lentil soup" });
}

describe("card favorite", () => {
  it("adds and removes a favorite, updating the saved recipe state", async () => {
    const user = userEvent.setup();
    const cache = show(false, [{ ...mark, delay: 100 }, remove]);
    expect(button()).toHaveAttribute("aria-pressed", "false");

    await user.click(button());
    expect(button()).toBeDisabled();
    await user.click(button());
    await waitFor(() =>
      expect(button()).toHaveAttribute("aria-pressed", "true"),
    );
    expect(
      cache.readFragment({
        id: "Ingredient:soup",
        fragment: CardFavoriteFragmentDoc,
      }),
    ).toMatchObject({ favorite: true });

    await user.click(button());
    await waitFor(() =>
      expect(button()).toHaveAttribute("aria-pressed", "false"),
    );
    expect(
      cache.readFragment({
        id: "Ingredient:soup",
        fragment: CardFavoriteFragmentDoc,
      }),
    ).toMatchObject({ favorite: false });
  });

  it.each([false, true])(
    "keeps favorite=%s after failure and allows retry",
    async (favorite) => {
      const user = userEvent.setup();
      const success = favorite ? remove : mark;
      show(favorite, [
        { request: success.request, error: new Error("Connection failed") },
        success,
      ]);

      await user.click(button());
      expect(await screen.findByText("Couldn’t update favorite")).toBeVisible();
      expect(button()).toHaveAttribute("aria-pressed", String(favorite));
      expect(button()).toBeEnabled();

      await user.click(button());
      await waitFor(() =>
        expect(button()).toHaveAttribute("aria-pressed", String(!favorite)),
      );
    },
  );

  it("supports keyboard removal even when the server favorite is already absent", async () => {
    const user = userEvent.setup();
    show(true, [
      {
        ...remove,
        result: { data: { favorite: { removeFavorite: false } } },
      },
    ]);
    await user.tab();
    expect(button()).toHaveFocus();
    await user.keyboard("{Enter}");
    await waitFor(() =>
      expect(button()).toHaveAttribute("aria-pressed", "false"),
    );
  });
});
