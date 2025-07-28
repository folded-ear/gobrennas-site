"use client";

import { Recipe } from "@/__graphql/graphql";
import { Button } from "@/components/ui/button";
import { EditIcon, EyeIcon } from "lucide-react";
import Link from "next/link";

export default function RecipeGrid({ recipes }: { recipes: Recipe[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {recipes?.map((recipe) => (
        <div key={recipe.id}>
          <Link href={`/recipes/${recipe.id}`}>{recipe.name}</Link>
          <Button variant="secondary">
            <EyeIcon />
          </Button>
          <Button variant="secondary">
            <EditIcon />
          </Button>
        </div>
      ))}
    </div>
  );
}
