"use client";

import { ButtonBar } from "@/components/ui/button-bar";
import { Card } from "@/components/ui/card";
import { RecipeCardFragment } from "@/data/types/fragments.generated";
import Link from "next/link";

export function RecipeCard({ recipe }: { recipe: RecipeCardFragment }) {
  return (
    <Card size="standard">
      <Card.Content>
        <Card.Title>
          <Link href={`/recipes/${recipe.id}`} className="hover:underline">
            {recipe.name}
          </Link>
        </Card.Title>
        <ButtonBar />
      </Card.Content>
    </Card>
  );
}
