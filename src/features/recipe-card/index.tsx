"use client";

import { RecipeActionBar } from "@/components/recipe-action-bar";
import { formatLastCooked } from "@/features/recipe-card/utils";
import { SendToPlan } from "@/features/send-to-plan";
import { OtherUserAvatar } from "@/features/user-avatar";
import { usePreference } from "@/hooks/use-preference";
import { PREF_ACTIVE_PLAN } from "@/lib/preferences";
import { FragmentType } from "@apollo/client";
import { useFragment } from "@apollo/client/react";
import { Button, Card, Chip } from "@heroui/react";
import Link from "next/link";
import { RecipeCardFragment, RecipeCardFragmentDoc } from "./__generated__/recipeCard.generated";
import { CardFavorite } from "./favorite";
import { CardPhoto } from "./photo";
import { RecipeEditIcon, RecipeViewIcon } from "@/components/icons";
import { useRouter } from "next/navigation";

type RecipeCardProps = {
  recipe: FragmentType<RecipeCardFragment>;
};

export function RecipeCard({ recipe }: RecipeCardProps) {
  const activePlanId = usePreference(PREF_ACTIVE_PLAN)!;
  const router = useRouter();
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
        <CardPhoto recipe={data} />
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
          <p className="text-xs text-muted">
            {lastCooked ? `Last cooked ${lastCooked}` : "Never cooked"}
          </p>

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
          <RecipeActionBar id={data.id}>
            <CardFavorite recipe={data} />
            <Button
              isIconOnly
              size="sm"
              variant="tertiary"
              onClick={() => router.push(`/recipes/${data.id}/edit`)}
            >
              <RecipeEditIcon />
            </Button>
            <Button
              isIconOnly
              size="sm"
              variant="tertiary"
              onClick={() => router.push(`/recipes/${data.id}`)}
            >
              <RecipeViewIcon />
            </Button>
          </RecipeActionBar>
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
