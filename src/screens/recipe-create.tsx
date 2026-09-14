"use client";

import { SectionHeader } from "@/components/section-header";
import { CreateRecipeForm } from "@/features/recipe-form/create-recipe-form";
import { useRouter } from "next/navigation";

export function RecipeCreate() {
  const router = useRouter();

  return (
    <>
      <SectionHeader title="Add Recipe" />
      <div className="w-full max-w-xl p-md">
        <CreateRecipeForm
          onCreated={(id) => router.replace(`/recipes/${id}`)}
          onCancel={() => router.replace("/recipes")}
        />
      </div>
    </>
  );
}
