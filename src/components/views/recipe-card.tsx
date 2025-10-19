"use client";

import { ButtonBar } from "@/components/ui/button-bar";
import { Card, CardTitle } from "@/components/ui/card";
import { RecipeCardFragment } from "@/data/types/fragments.generated";
import { CardBody } from "@heroui/card";
import Link from "next/link";

export function RecipeCard({ recipe }: { recipe: RecipeCardFragment }) {
  return (
    <Card size="standard">
      <CardBody>
        <CardTitle>
          <Link href={`/recipes/${recipe.id}`} className="hover:underline">
            {recipe.name}
          </Link>
        </CardTitle>
        <ButtonBar />
      </CardBody>
    </Card>
  );
}
