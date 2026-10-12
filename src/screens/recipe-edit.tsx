"use client";

import { EditRecipeForm } from "@/features/recipe-form/edit-recipe-form";
import { useEditorPhotos } from "@/screens/use-editor-photos";
import { useRouter } from "next/navigation";

type RecipeEditProps = { id: string };

export function RecipeEdit({ id }: RecipeEditProps) {
  const router = useRouter();
  const { additions, photosScreen } = useEditorPhotos();
  const returnToRecipe = () =>
    router.replace(`/recipes/${encodeURIComponent(id)}`);
  return (
    <>
      <EditRecipeForm
        key={id}
        id={id}
        {...additions}
        onSaved={returnToRecipe}
        onCancel={returnToRecipe}
        onDeleted={() => router.replace("/recipes")}
      />
      {photosScreen}
    </>
  );
}
