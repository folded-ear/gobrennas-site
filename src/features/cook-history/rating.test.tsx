import {
  buildInMemoryCache,
  render,
  screen,
  seedFragment,
  userEvent,
  waitFor,
} from "@/test";
import type { MockLink } from "@apollo/client/testing";
import { describe, expect, it } from "vitest";
import { CookRatingFragmentDoc } from "./__generated__/cookRating.generated";
import { SetCookRatingDocument } from "./__generated__/setCookRating.generated";
import { CookRating } from "./rating";
import { LENTIL_SOUP, ratingSaved } from "./test/history";

const COOK = "8777749733301";

function show(
  ratingInt: number | null,
  editable: boolean,
  mocks: readonly MockLink.MockedResponse[] = [],
) {
  const cache = buildInMemoryCache();
  const record = seedFragment(cache, CookRatingFragmentDoc, "cookRating", {
    __typename: "PlannedRecipeHistory",
    id: COOK,
    ratingInt,
  });
  render(
    <CookRating record={record} recipeId={LENTIL_SOUP} editable={editable} />,
    { cache, mocks },
  );
}

const star = (n: number) =>
  screen.getByRole("radio", { name: n === 1 ? "1 star" : `${n} stars` });

describe("CookRating", () => {
  it("saves the rating its owner chooses", async () => {
    show(3, true, [ratingSaved(COOK, 5)]);
    expect(star(3)).toBeChecked();

    await userEvent.click(star(5));

    await waitFor(() => expect(star(5)).toBeChecked());
  });

  it("offers an unrated cook's owner the stars", () => {
    show(null, true);
    expect(screen.getByRole("radiogroup", { name: "Rating" })).toBeVisible();
    expect(star(1)).toBeEnabled();
  });

  it("keeps the rating and says so when saving fails", async () => {
    show(3, true, [
      {
        request: {
          query: SetCookRatingDocument,
          variables: { recipeId: LENTIL_SOUP, id: COOK, rating: 5 },
        },
        error: new Error("Connection failed"),
      },
    ]);

    await userEvent.click(star(5));

    expect(await screen.findByText("Couldn’t save the rating")).toBeVisible();
    expect(star(3)).toBeChecked();
  });

  it("shows someone else's rating without letting it change", async () => {
    show(3, false);

    await userEvent.click(star(5));

    expect(star(3)).toBeChecked();
  });

  it("shows nothing for someone else's unrated cook", () => {
    show(null, false);
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
  });
});
