"use client";

import { RecipeReading } from "@/features/recipe-detail/reading";
import { SharedRecipeDocument } from "@/screens/__generated__/shared-recipe.generated";
import { useSuspenseQuery } from "@apollo/client/react";

type SharedRecipeProps = { id: string; secret: string };

/** I show a recipe to whoever holds its share secret, for reading only. */
export function SharedRecipe({ id, secret }: SharedRecipeProps) {
  // Public routes have no loading.tsx by default; the page waits for me.
  const { data } = useSuspenseQuery(SharedRecipeDocument, {
    variables: { id, secret },
  });
  return <RecipeReading recipe={data.library.getRecipeById} />;
}
