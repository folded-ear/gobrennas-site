"use client";

import { useRouter } from "next/navigation";
import { RecipeForm } from "./index";

export function RecipeAddForm() {
  const router = useRouter();

  return (
    <RecipeForm
      onSaved={(id) => router.push(`/recipes/${id}`)}
      onCancel={() => router.push("/recipes")}
    />
  );
}
