"use client";

import { useDeleteRecipe } from "@/features/recipe-form/use-delete-recipe";
import { skipToken, useSuspenseQuery } from "@apollo/client/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { flushSync } from "react-dom";
import {
  GetRecipeDetailDocument,
  type GetRecipeDetailQuery,
} from "./__generated__/getRecipeDetail.generated";
import { LibraryRecipeActions } from "./action-bar";
import { RecipeReading } from "./reading";

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

  return (
    <RecipeReading
      recipe={recipe}
      inScreen={inScreen}
      actions={
        <LibraryRecipeActions recipe={recipe} onDelete={deleteFromDetail} />
      }
      onClose={() => (inScreen ? router.back() : router.replace("/recipes"))}
    />
  );
}
