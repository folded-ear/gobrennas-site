"use client";

import { CreateRecipeForm } from "@/features/recipe-form/create-recipe-form";
import { useEditorPhotos } from "@/screens/use-editor-photos";
import { useRouter } from "next/navigation";

type RecipeCreateProps = {
  /** A photo job whose text the new recipe starts from, if any. */
  initialJobId?: string;
};

export function RecipeCreate({ initialJobId }: RecipeCreateProps) {
  const router = useRouter();
  const { additions, photosScreen } = useEditorPhotos(initialJobId);

  return (
    <>
      <CreateRecipeForm
        {...additions}
        onCreated={(id) => router.replace(`/recipes/${id}`)}
        onCancel={() => router.replace("/recipes")}
      />
      {photosScreen}
    </>
  );
}
