import { PlanItemStatus } from "@/__generated__/graphql";
import type { GraphQLCodegenDataMasking } from "@apollo/client/masking";
import type { MockLink } from "@apollo/client/testing";
import type { CookHistoryRecordFragment } from "../__generated__/cookHistoryRecord.generated";
import {
  GetCookHistoryDocument,
  type GetCookHistoryQuery,
} from "../__generated__/getCookHistory.generated";
import { SetCookNotesDocument } from "../__generated__/setCookNotes.generated";
import { SetCookRatingDocument } from "../__generated__/setCookRating.generated";

type Unmasked<T> = GraphQLCodegenDataMasking.Unmasked<T>;
type Record = Unmasked<CookHistoryRecordFragment>;

export const LENTIL_SOUP = "8777749711101";

export const BRENNA = {
  __typename: "User",
  id: "8777749727401",
  name: "Brenna Boisvert",
  email: "brenna@example.com",
  imageUrl: null,
} as const;

export const BARNEY = {
  __typename: "User",
  id: "8777749727402",
  name: "Barney Boisvert",
  email: "barney@example.com",
  imageUrl: null,
} as const;

/** I build a cook of the lentil soup, cooked unless told otherwise. */
export function cook(
  id: string,
  owner: typeof BRENNA | typeof BARNEY,
  doneAt: string,
  {
    status = PlanItemStatus.COMPLETED,
    ratingInt = null,
    notes = null,
  }: Partial<Pick<Record, "status" | "ratingInt" | "notes">> = {},
): Record {
  return {
    __typename: "PlannedRecipeHistory",
    id,
    status,
    doneAt,
    owner,
    ratingInt,
    notes,
  };
}

/** I answer a history query for the lentil soup, as Brenna. */
export function historyListed(
  last: number,
  cooks: readonly Record[],
  recordCount = cooks.length,
): MockLink.MockedResponse {
  const data: Unmasked<GetCookHistoryQuery> = {
    profile: {
      __typename: "ProfileQuery",
      me: { __typename: "User", id: BRENNA.id },
    },
    library: {
      __typename: "LibraryQuery",
      getRecipeById: {
        __typename: "Recipe",
        id: LENTIL_SOUP,
        recordCount,
        plannedHistory: cooks.slice(0, last),
      },
    },
  };
  return {
    request: {
      query: GetCookHistoryDocument,
      variables: { id: LENTIL_SOUP, last },
    },
    result: { data },
  };
}

/** I answer saving a cook's rating. */
export function ratingSaved(
  id: string,
  rating: number,
): MockLink.MockedResponse {
  return {
    request: {
      query: SetCookRatingDocument,
      variables: { recipeId: LENTIL_SOUP, id, rating },
    },
    result: {
      data: {
        library: {
          __typename: "LibraryMutation",
          history: {
            __typename: "RecipeHistoryMutation",
            setRating: {
              __typename: "PlannedRecipeHistory",
              id,
              ratingInt: rating,
            },
          },
        },
      },
    },
  };
}

/** I answer saving a cook's notes. */
export function notesSaved(id: string, notes: string): MockLink.MockedResponse {
  return {
    request: {
      query: SetCookNotesDocument,
      variables: { recipeId: LENTIL_SOUP, id, notes },
    },
    result: {
      data: {
        library: {
          __typename: "LibraryMutation",
          history: {
            __typename: "RecipeHistoryMutation",
            setNotes: { __typename: "PlannedRecipeHistory", id, notes },
          },
        },
      },
    },
  };
}
