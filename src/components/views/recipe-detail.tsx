"use client";

import UserAvatar from "@/components/ui/user-avatar";
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
      <h1 className="text-xl">{recipe.name}</h1>
      <UserAvatar user={recipe.owner} />
      <div className="flex flex-col gap-sm">
        {recipe.ingredients.map((ingredient) => (
          <p key={ingredient.raw}>{ingredient.raw}</p>
        ))}
      </div>
    </div>
  );
}
