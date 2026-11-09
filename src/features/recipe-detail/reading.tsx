"use client";

import { Screen } from "@/components/screen";
import { IngredientsAndDirections } from "@/features/recipe-ingredients-and-directions";
import { RecipePhoto } from "@/features/recipe-photo";
import { RecipeSections } from "@/features/recipe-sections";
import { OtherUserAvatar } from "@/features/user-avatar";
import type { FragmentType } from "@apollo/client";
import { useFragment } from "@apollo/client/react";
import type { ReactNode } from "react";
import {
  type RecipeReadingFragment,
  RecipeReadingFragmentDoc,
} from "./__generated__/recipeReading.generated";
import { RecipeActionBar } from "./action-bar";
import { RecipeInformation } from "./information";

type RecipeReadingProps = {
  recipe: FragmentType<RecipeReadingFragment>;
  /** Set in my action bar, before Close. */
  actions?: ReactNode;
  onClose?: () => void;
  inScreen?: boolean;
};

/** I show a recipe for reading, under its title bar. */
export function RecipeReading({
  recipe,
  actions,
  onClose,
  inScreen = false,
}: RecipeReadingProps) {
  const { data, complete } = useFragment({
    fragment: RecipeReadingFragmentDoc,
    fragmentName: "recipeReading",
    from: recipe,
  });
  if (!complete) return null;

  const header = (
    <RecipeActionBar
      title={
        <div className="flex min-w-0 items-center gap-sm">
          <OtherUserAvatar user={data.ownedBy} />
          <h1 className="break-words">{data.name}</h1>
        </div>
      }
      onClose={onClose}
    >
      {actions}
    </RecipeActionBar>
  );
  const content = (
    <div className="flex flex-col gap-lg pb-md">
      <RecipeInformation {...data} />
      <IngredientsAndDirections
        parent={data}
        ingredientHeader={
          data.photo ? (
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg">
              <RecipePhoto
                recipe={data}
                loading="eager"
                sizes="(min-width: 1024px) 400px, (min-width: 768px) 40vw, 100vw"
              />
            </div>
          ) : undefined
        }
      />
      <RecipeSections recipe={data} />
    </div>
  );

  if (inScreen)
    return (
      <Screen
        label={data.name}
        showCloseButton={false}
        header={<div className="mx-auto w-full max-w-5xl pb-md">{header}</div>}
      >
        <article className="mx-auto w-full max-w-5xl">{content}</article>
      </Screen>
    );
  return (
    <article className="mx-auto flex w-full max-w-5xl flex-col gap-lg">
      <div className="sticky top-0 z-10 bg-background">{header}</div>
      {content}
    </article>
  );
}
