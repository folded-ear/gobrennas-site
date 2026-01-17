"use client";

import { ButtonBar } from "@/components/ui/button-bar";
import { RecipeCardFragment } from "@/data/__generated__/fragments.generated";
import { Card } from "@heroui/react";
import Link from "next/link";

export function RecipeCard({ recipe }: { recipe: RecipeCardFragment }) {
  return (
    <Card>
      <Card.Header>
        <Link href={`/recipes/${recipe.id}`} className="hover:underline">
          {recipe.name}
        </Link>
      </Card.Header>
      <ButtonBar />
    </Card>
  );
}
