"use client";

import { Recipe } from "@/__graphql/graphql";
import { Button } from "@/components/ui/button";
import { EditIcon, EyeIcon } from "lucide-react";
import Link from "next/link";

export default function RecipeGrid({ recipes }: { recipes: Recipe[] }) {
  return (
    <div className="flex flex-col flex-wrap gap-sm">
      {recipes?.map((recipe) => (
        <div key={recipe.id} className="flex gap-sm items-center">
          <Link href={`/recipes/${recipe.id}`} className="hover:underline">
            {recipe.name}
          </Link>
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/recipes/${recipe.id}`}>
              <EyeIcon />
            </Link>
          </Button>
          <Button variant="ghost">
            <EditIcon />
          </Button>
        </div>
      ))}
    </div>
  );
}
