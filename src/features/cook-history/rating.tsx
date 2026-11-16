"use client";

import { StarRating } from "@/components/star-rating";
import type { FragmentType } from "@apollo/client";
import { useFragment, useMutation } from "@apollo/client/react";
import { toast } from "@heroui/react";
import {
  type CookRatingFragment,
  CookRatingFragmentDoc,
} from "./__generated__/cookRating.generated";
import { SetCookRatingDocument } from "./__generated__/setCookRating.generated";

const LABEL = "Rating";

type CookRatingProps = {
  record: FragmentType<CookRatingFragment>;
  recipeId: string;
  /** Whether the viewer may change the rating. */
  editable: boolean;
};

/** I show a cook's rating, and let its owner change it. */
export function CookRating({ record, recipeId, editable }: CookRatingProps) {
  const { data, complete } = useFragment({
    fragment: CookRatingFragmentDoc,
    fragmentName: "cookRating",
    from: record,
  });
  const [save, { loading }] = useMutation(SetCookRatingDocument);
  if (!complete) return null;
  const { id, ratingInt } = data;
  if (!editable) {
    return ratingInt === null ? null : (
      <StarRating aria-label={LABEL} value={ratingInt} isReadOnly />
    );
  }

  async function choose(rating: number) {
    try {
      const result = await save({ variables: { recipeId, id, rating } });
      if (result.data?.library.history?.setRating.ratingInt !== rating)
        throw new Error("No saved rating returned.");
    } catch {
      toast.danger("Couldn’t save the rating", {
        description: "Please try again.",
      });
    }
  }

  return (
    <StarRating
      aria-label={LABEL}
      value={ratingInt}
      onChange={choose}
      isDisabled={loading}
    />
  );
}
