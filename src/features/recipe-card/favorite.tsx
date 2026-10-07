"use client";

import { FragmentType } from "@apollo/client";
import {
  useApolloClient,
  useFragment,
  useMutation,
} from "@apollo/client/react";
import { Button, toast } from "@heroui/react";
import { Bookmark } from "lucide-react";
import { useRef } from "react";
import {
  CardFavoriteFragment,
  CardFavoriteFragmentDoc,
  MarkCardFavoriteDocument,
  RemoveCardFavoriteDocument,
} from "./__generated__/cardFavorite.generated";

export function CardFavorite({
  recipe,
}: {
  recipe: FragmentType<CardFavoriteFragment>;
}) {
  const { data, complete } = useFragment({
    fragment: CardFavoriteFragmentDoc,
    from: recipe,
  });
  const client = useApolloClient();
  const [mark, { loading: marking }] = useMutation(MarkCardFavoriteDocument);
  const [remove, { loading: removing }] = useMutation(
    RemoveCardFavoriteDocument,
  );
  const pending = useRef(false);

  async function toggle() {
    if (!complete || pending.current) return;
    pending.current = true;
    try {
      const variables = { id: data.id };
      if (data.favorite) {
        const result = await remove({ variables });
        // False means it was already absent, which is also a successful removal.
        if (result.data?.favorite.removeFavorite === undefined)
          throw new Error("No favorite removal result returned.");
      } else {
        const result = await mark({ variables });
        if (!result.data?.favorite.markFavorite.id)
          throw new Error("No favorite returned.");
      }
      client.cache.modify({
        id: client.cache.identify(data),
        fields: { favorite: () => !data.favorite },
      });
    } catch {
      toast.danger("Couldn’t update favorite", {
        description: "Please try again.",
      });
    } finally {
      pending.current = false;
    }
  }

  if (!complete) return null;
  return (
    <Button
      isIconOnly
      size="sm"
      variant="tertiary"
      aria-label={`Favorite: ${data.name}`}
      aria-pressed={data.favorite}
      isDisabled={marking || removing}
      onPress={() => {
        void toggle();
      }}
    >
      <Bookmark
        aria-hidden="true"
        className={data.favorite ? "fill-current" : undefined}
      />
    </Button>
  );
}
