"use client";

import { ButtonBar } from "@/components/ui/button-bar";
import RecipePhoto from "@/components/ui/recipe-photo";
import { RecipeCardFragment } from "@/data/__generated__/fragments.generated";
import { Card } from "@heroui/react";
import Link from "next/link";

export function RecipeCard({ recipe }: { recipe: RecipeCardFragment }) {
  return (
    <Card>
      <RecipePhoto
        photo={recipe.photo ?? undefined}
        alt={recipe.name}
        className="opacity-20"
      />
      <Card.Header className="z-10">
        <Card.Title className="text-xl text-shadow-white text-shadow-lg/40">
          <Link href={`/recipes/${recipe.id}`} className="hover:underline">
            {recipe.name}
          </Link>
        </Card.Title>
      </Card.Header>
      <Card.Footer>
        <ButtonBar id={recipe.id} />
      </Card.Footer>
    </Card>
  );
}
