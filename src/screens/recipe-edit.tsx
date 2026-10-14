"use client";

import { EditRecipeForm } from "@/features/recipe-form/edit-recipe-form";
import { useEditorPhotos } from "@/screens/use-editor-photos";
import { toast } from "@heroui/react";
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
        onSaved={(savedId) => {
          if (savedId === id) returnToRecipe();
          else {
            router.replace("/recipes");
            const notification = toast.success("Copy saved to your library", {
              actionProps: {
                children: "Open copy",
                onPress: () => {
                  toast.close(notification);
                  router.push(`/recipes/${encodeURIComponent(savedId)}`);
                },
              },
            });
          }
        }}
        onCancel={returnToRecipe}
        onDeleted={() => router.replace("/recipes")}
      />
      {photosScreen}
    </>
  );
}
