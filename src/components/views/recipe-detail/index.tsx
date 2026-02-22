"use client";

import { IngredientsAndDirections } from "@/components/ui/ingredients-and-directions";
import { RecipePhoto } from "@/components/ui/recipe-photo";
import { RecipeSections } from "@/components/ui/recipe-sections";
import { UserAvatar } from "@/components/ui/user-avatar";
import { GET_RECIPE_DETAIL_QUERY } from "@/components/views/recipe-detail/query";
import { useSuspenseQuery } from "@apollo/client/react";

type RecipeDetailProps = {
  id: string;
};

export function RecipeDetail({ id }: RecipeDetailProps) {
  const { data } = useSuspenseQuery(GET_RECIPE_DETAIL_QUERY, {
    variables: { id },
  });

  const recipe = data.library.getRecipeById;

  return (
    <div className="flex flex-col gap-1">
      <div className="w-full flex gap-1">
        <UserAvatar user={recipe.owner} />
        <h2 className="text-xl">{recipe.name}</h2>
      </div>
      {recipe.photo && (
        <div className="relative min-h-80">
          <RecipePhoto recipe={recipe} loading="eager" />
        </div>
      )}
      <div className="flex flex-col gap-sm">
        <IngredientsAndDirections parent={recipe} />
      </div>
      <RecipeSections recipe={recipe} />
    </div>
  );
}
