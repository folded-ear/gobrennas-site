"use client";

import { Screen } from "@/components/screen";
import { useDeleteRecipe } from "@/features/recipe-form/use-delete-recipe";
import { IngredientsAndDirections } from "@/features/recipe-ingredients-and-directions";
import { RecipePhoto } from "@/features/recipe-photo";
import { RecipeSections } from "@/features/recipe-sections";
import { OtherUserAvatar } from "@/features/user-avatar";
import { skipToken, useSuspenseQuery } from "@apollo/client/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { flushSync } from "react-dom";
import {
  GetRecipeDetailDocument,
  type GetRecipeDetailQuery,
} from "./__generated__/getRecipeDetail.generated";
import { LibraryRecipeActions, RecipeActionBar } from "./action-bar";
import { RecipeInformation } from "./information";

type RecipeDetailProps = {
  id: string;
  inScreen?: boolean;
};

export function RecipeDetail(props: RecipeDetailProps) {
  return <RecipeDetailQuery key={props.id} {...props} />;
}

function RecipeDetailQuery({ id, inScreen = false }: RecipeDetailProps) {
  const [deleting, setDeleting] = useState(false);
  // Private detail routes currently have no loading.tsx boundary.
  const { data } = useSuspenseQuery(
    GetRecipeDetailDocument,
    deleting ? skipToken : { variables: { id } },
  );
  if (!data) return null;

  return (
    <LoadedRecipeDetail
      recipe={data.library.getRecipeById}
      inScreen={inScreen}
      onDeleting={() => {
        // Apply standby before starting the mutation, even if it resolves before
        // React would otherwise commit. Stay paused until the route unmounts.
        flushSync(() => setDeleting(true));
      }}
      onDeleteFailed={() => setDeleting(false)}
    />
  );
}

function LoadedRecipeDetail({
  recipe,
  inScreen,
  onDeleting,
  onDeleteFailed,
}: {
  recipe: GetRecipeDetailQuery["library"]["getRecipeById"];
  inScreen: boolean;
  onDeleting: () => void;
  onDeleteFailed: () => void;
}) {
  const router = useRouter();
  const remove = useDeleteRecipe(recipe, () => router.replace("/recipes"));
  async function deleteFromDetail() {
    onDeleting();
    try {
      await remove();
    } catch (error) {
      onDeleteFailed();
      throw error;
    }
  }

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
      <LibraryRecipeActions recipe={recipe} onDelete={deleteFromDetail} />
    </RecipeActionBar>
  );
  const content = (
    <div className="flex flex-col gap-lg pb-md">
      <RecipeInformation {...recipe} />
      <IngredientsAndDirections
        parent={recipe}
        ingredientHeader={
          recipe.photo ? (
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg">
              <RecipePhoto
                recipe={recipe}
                loading="eager"
                sizes="(min-width: 1024px) 400px, (min-width: 768px) 40vw, 100vw"
              />
            </div>
          ) : undefined
        }
      />
      <RecipeSections recipe={recipe} />
    </div>
  );

  if (inScreen)
    return (
      <Screen
        label={recipe.name}
        showCloseButton={false}
        header={<div className="mx-auto w-full max-w-5xl pb-md">{header}</div>}
      >
        <article className="mx-auto w-full max-w-5xl">{content}</article>
      </Screen>
    );
  return (
    <article className="mx-auto flex w-full max-w-5xl flex-col gap-lg">
      {header}
      {content}
    </article>
  );
}
