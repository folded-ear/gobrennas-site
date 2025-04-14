"use client";

import { Recipe } from "@/__graphql/graphql";
import { Button, Flex, Well } from "@adobe/react-spectrum";
import { EditIcon, EyeIcon } from "lucide-react";
import Link from "next/link";

export default function RecipeGrid({ recipes }: { recipes: Recipe[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {recipes?.map((recipe) => (
        <Well key={recipe.id}>
          <Link href={`/recipes/${recipe.id}`}>{recipe.name}</Link>
          <Flex>
            <Button variant="primary">
              <EyeIcon />
            </Button>
            <Button variant="primary">
              <EditIcon />
            </Button>
          </Flex>
        </Well>
      ))}
    </div>
  );
}
