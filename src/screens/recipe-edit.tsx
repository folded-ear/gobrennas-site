"use client";

import { EditRecipeForm } from "@/features/recipe-form/edit-recipe-form";
import { useEditorPhotos } from "@/screens/use-editor-photos";
import { useRouter } from "next/navigation";

type RecipeEditProps = { id: string; copy?: boolean };

export function RecipeEdit({ id, copy = false }: RecipeEditProps) {
  const router = useRouter();
  const { additions, photosScreen } = useEditorPhotos();
  const returnToRecipe = () =>
    router.replace(`/recipes/${encodeURIComponent(id)}`);
  return (
    <>
      <EditRecipeForm
        key={`${id}:${copy}`}
        id={id}
        copy={copy}
        {...additions}
        onSaved={(savedId) =>
          router.replace(`/recipes/${encodeURIComponent(savedId)}`)
        }
        onCancel={returnToRecipe}
        onDeleted={() => router.replace("/recipes")}
      />
      {photosScreen}
    </>
  );
}
