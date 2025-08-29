"use client";

import { GetSearchLibraryQuery } from "@/__graphql/graphql";
import { Button } from "@/components/ui/button";
import { RecipeCard } from "@/components/ui/recipe-card";
import { EditIcon, EyeIcon, Star } from "lucide-react";
import Link from "next/link";

export default function RecipeGrid({
  recipes,
}: {
  recipes: GetSearchLibraryQuery["library"]["recipes"]["edges"][0]["node"][];
}) {
  return (
    <div className="grid lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1 gap-y-lg">
      {recipes?.map((recipe) => (
        <div key={recipe.id}>
          <RecipeCard size="standard">
            <RecipeCard.Header>
              <Button variant="ghost">
                <Star />
              </Button>
            </RecipeCard.Header>
            <RecipeCard.Content>
              <RecipeCard.Title>
                <Link
                  href={`/recipes/${recipe.id}`}
                  className="hover:underline"
                >
                  {recipe.name}
                </Link>
              </RecipeCard.Title>
            </RecipeCard.Content>
            <RecipeCard.Footer>
              <Button variant="ghost" size="icon">
                <Link href={`/recipes/${recipe.id}`}>
                  <EyeIcon />
                </Link>
              </Button>
              <Button variant="ghost">
                <EditIcon />
              </Button>
            </RecipeCard.Footer>
          </RecipeCard>
        </div>
      ))}
    </div>
  );
}
