"use client";

import { RecipeActionBar } from "@/components/recipe-action-bar";
import { OtherUserAvatar } from "@/features/profile/user-avatar";
import { RecipePhoto } from "@/features/recipes/photo";
import { formatLastCooked } from "@/features/recipes/utils";
import { SendToPlan } from "@/features/send-to-plan";
import { usePreference } from "@/hooks/use-preference";
import { PREF_ACTIVE_PLAN } from "@/lib/preferences";
import { FragmentType } from "@apollo/client";
import { useFragment } from "@apollo/client/react";
import { Card, Chip } from "@heroui/react";
import { Bookmark } from "lucide-react";
import Link from "next/link";
import {
  RecipeCardFragment,
  RecipeCardFragmentDoc,
} from "./__generated__/recipeCard.generated";

type RecipeCardProps = {
  recipe: FragmentType<RecipeCardFragment>;
};

export function RecipeCard({ recipe }: RecipeCardProps) {
  const activePlanId = usePreference(PREF_ACTIVE_PLAN)!;
  const { data, complete } = useFragment({
    fragment: RecipeCardFragmentDoc,
    fragmentName: "recipeCard",
    from: recipe,
  });

  if (!complete) return <h1>Ain&apos;t got no data, yo!</h1>;

  const lastCook = data.plannedHistory?.[0] ?? null;
  const lastCooked = lastCook?.doneAt
    ? formatLastCooked(lastCook.doneAt)
    : null;
  const rating = lastCook?.ratingInt ?? 0;

  return (
    <Card className="flex flex-row overflow-hidden min-w-24 rounded-sm">
      <div className="relative w-1/4">
        <Bookmark
          className={`absolute right-2 bottom-2 bg-gray-900/80 rounded-full p-xs size-6 text-white ${data.favorite ? "fill-white" : "transparent"}`}
        />
        <RecipePhoto recipe={data} />
      </div>
      <div className="flex-1 flex flex-col gap-sm p-sm">
        <Card.Header>
          <Card.Title>
            <Link
              href={`/recipes/${data.id}`}
              className="font-semibold text-sm leading-snug hover:underline line-clamp-2 flex-1"
            >
              {data.name}
            </Link>
            <OtherUserAvatar user={data.ownedBy} />
          </Card.Title>
        </Card.Header>
        <Card.Content>
          {lastCooked && (
            <p className="text-xs text-muted">Last cooked {lastCooked}</p>
          )}

          {data.labels && data.labels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {data.labels.map((label) => (
                <Chip key={label} size="sm" variant="secondary">
                  {label}
                </Chip>
              ))}
            </div>
          )}
        </Card.Content>

        <Card.Footer>
          <RecipeActionBar id={data.id} />
          <SendToPlan
            variant="tertiary"
            size="sm"
            recipeId={data.id}
            activePlanId={activePlanId}
          />
        </Card.Footer>
      </div>
    </Card>
  );
}
