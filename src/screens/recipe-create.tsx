"use client";

import { CreateRecipeForm } from "@/features/recipe-form/create-recipe-form";
import { useRouter } from "next/navigation";

export function RecipeCreate() {
  const router = useRouter();

  return (
    <CreateRecipeForm
      onCreated={(id) => router.replace(`/recipes/${id}`)}
      onCancel={() => router.replace("/recipes")}
    />
  );
}
