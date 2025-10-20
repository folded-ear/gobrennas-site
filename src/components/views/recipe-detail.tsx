"use client";

import { GET_RECIPE_BY_ID } from "@/data/get-recipe-by-id";
import { useSuspenseQuery } from "@apollo/client/react";
import { redirect } from "next/navigation";

type RecipeDetailProps = {
  id: string;
};

export default function RecipeDetail({ id }: RecipeDetailProps) {
  const { data } = useSuspenseQuery(GET_RECIPE_BY_ID, {
    variables: { id },
  });
  const recipe = data?.library.getRecipeById;

  if (!recipe) {
    redirect("/");
  }

  return (
    <div className="flex flex-col">
      {/*
       React's handling of title only works if there is no suspense boundary
       or the boundary doesn't actually suspend.
       */}
      <title>{recipe.name}</title>
      <h1>{recipe.name}</h1>
      <div className="flex flex-col gap-sm">
        {recipe.ingredients.map((ingredient) => (
          <p key={ingredient.raw}>{ingredient.raw}</p>
        ))}
      </div>
    </div>
  );
}
