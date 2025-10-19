"use client";

import { RecipeCard } from "@/components/views/recipe-card";
import { SEARCH_RECIPES } from "@/data/search-recipes";
import { useQuery } from "@apollo/client/react";

export default function RecipeGrid() {
  const { data } = useQuery(SEARCH_RECIPES);
  const recipes = data?.library.recipes.edges.map((edge) => edge.node);

  return (
    <div className="grid lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1 gap-lg">
      {recipes?.map((recipe) => (
        <div key={recipe.id}>
          <RecipeCard recipe={recipe} />
        </div>
      ))}
    </div>
  );
}
