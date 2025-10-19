"use client";

import { GET_RECIPE_BY_ID } from "@/data/get-recipe-by-id";
import { GetRecipeByIdQuery } from "@/data/types/get-recipe-by-id.generated";
import { useQuery } from "@apollo/client/react";
import { redirect } from "next/navigation";

type RecipeDetailProps = {
  id: string;
};

export default function RecipeDetail({ id }: RecipeDetailProps) {
  const { data } = useQuery<GetRecipeByIdQuery>(GET_RECIPE_BY_ID, {
    variables: { id },
  });
  const recipe = data?.library.getRecipeById;

  if (!recipe) {
    redirect("/");
  }

  return (
    <div className="flex flex-col">
      <h1>{recipe.name}</h1>
      <div className="flex flex-col gap-sm">
        {recipe.ingredients.map((ingredient) => (
          <p key={ingredient.raw}>{ingredient.raw}</p>
        ))}
      </div>
    </div>
  );
}
