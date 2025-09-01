"use client";

import { GetSearchLibraryQuery } from "@/__graphql/graphql";
import { ButtonBar } from "@/components/ui/button-bar";
import { RecipeCard } from "@/components/ui/recipe-card";
import Link from "next/link";

export default function RecipeGrid({
  recipes,
}: {
  recipes: GetSearchLibraryQuery["library"]["recipes"]["edges"][0]["node"][];
}) {
  return (
    <div className="grid lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1 gap-lg">
      {recipes?.map((recipe) => (
        <div key={recipe.id}>
          <RecipeCard size="standard">
            <RecipeCard.Content>
              <RecipeCard.Title>
                <Link
                  href={`/recipes/${recipe.id}`}
                  className="hover:underline"
                >
                  {recipe.name}
                </Link>
              </RecipeCard.Title>
              <ButtonBar />
            </RecipeCard.Content>
          </RecipeCard>
        </div>
      ))}
    </div>
  );
}
