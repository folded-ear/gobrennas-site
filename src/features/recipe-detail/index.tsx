"use client";

import { Screen } from "@/components/screen";
import { useDeleteRecipe } from "@/features/recipe-form/use-delete-recipe";
import { IngredientsAndDirections } from "@/features/recipe-ingredients-and-directions";
import { RecipePhoto } from "@/features/recipe-photo";
import { RecipeSections } from "@/features/recipe-sections";
import { OtherUserAvatar } from "@/features/user-avatar";
import { useSuspenseQuery } from "@apollo/client/react";
import { useRouter } from "next/navigation";
import { GetRecipeDetailDocument } from "./__generated__/getRecipeDetail.generated";
import { LibraryRecipeActions, RecipeActionBar } from "./action-bar";
import { RecipeInformation } from "./information";

type RecipeDetailProps = {
  id: string;
  inScreen?: boolean;
};

export function RecipeDetail({ id, inScreen = false }: RecipeDetailProps) {
  const router = useRouter();
  // Private detail routes currently have no loading.tsx boundary.
  const { data } = useSuspenseQuery(GetRecipeDetailDocument, {
    variables: { id },
  });

  const recipe = data.library.getRecipeById;
  const remove = useDeleteRecipe(recipe, () => router.replace("/recipes"));

  const header = (
    <RecipeActionBar
      title={
        <div className="flex min-w-0 items-center gap-sm">
          <OtherUserAvatar user={recipe.ownedBy} />
          <h1 className="break-words">{recipe.name}</h1>
        </div>
      }
      onClose={() => (inScreen ? router.back() : router.replace("/recipes"))}
    >
      <LibraryRecipeActions recipe={recipe} onDelete={remove} />
    </RecipeActionBar>
  );
  const content = (
    <div className="flex flex-col gap-xl pb-xl">
      <div
        className={
          recipe.photo
            ? "grid items-start gap-xl sm:grid-cols-[16rem_minmax(0,1fr)]"
            : undefined
        }
      >
        {recipe.photo ? (
          <div className="relative aspect-[4/3] w-full max-w-64 overflow-hidden rounded-lg">
            <RecipePhoto recipe={recipe} loading="eager" sizes="256px" />
          </div>
        ) : null}
        <RecipeInformation {...recipe} />
      </div>
      <IngredientsAndDirections parent={recipe} />
      <RecipeSections recipe={recipe} />
    </div>
  );

  if (inScreen)
    return (
      <Screen
        label={recipe.name}
        showCloseButton={false}
        header={<div className="mx-auto w-full max-w-5xl pb-xl">{header}</div>}
      >
        <article className="mx-auto w-full max-w-5xl">{content}</article>
      </Screen>
    );
  return (
    <article className="mx-auto flex w-full max-w-5xl flex-col gap-xl">
      {header}
      {content}
    </article>
  );
}
