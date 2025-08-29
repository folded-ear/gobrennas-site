"use client";

import { GetRecipeWithEverythingQuery } from "@/__graphql/graphql";

export default function RecipeDetail({
  recipe,
}: {
  recipe?: GetRecipeWithEverythingQuery["library"]["getRecipeById"];
}) {
  return (
    <div className="flex flex-col">
      <h1>{recipe?.name}</h1>
      <div className="flex flex-col gap-sm">
        <div>ingredients</div>
        <div>{recipe?.directions}</div>
      </div>
    </div>
  );
}
