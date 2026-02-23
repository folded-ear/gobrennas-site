"use client";

import { ButtonBar } from "@/components/ui/button-bar";
import { RecipePhoto } from "@/components/ui/recipe-photo";
import { UserAvatar } from "@/components/ui/user-avatar";
import { FragmentType } from "@apollo/client";
import { useFragment } from "@apollo/client/react";
import { Card } from "@heroui/react";
import Link from "next/link";
import {
  RecipeCardFragment,
  RecipeCardFragmentDoc,
} from "./__generated__/recipeCard.generated";

type RecipeCardProps = {
  recipe: FragmentType<RecipeCardFragment>;
};

export function RecipeCard({ recipe }: RecipeCardProps) {
  const { data, complete } = useFragment({
    fragment: RecipeCardFragmentDoc,
    fragmentName: "recipeCard",
    from: recipe,
  });

  if (!complete) return <h1>Ain&apos;t got not data, yo!</h1>;

  return (
    <Card>
      {data.photo && <RecipePhoto recipe={data} className="opacity-20" />}
      <Card.Header className="z-10 flex flex-row justify-between">
        <Card.Title className="text-xl text-shadow-white text-shadow-lg/40">
          <Link href={`/recipes/${data.id}`} className="hover:underline">
            {data.name}
          </Link>
        </Card.Title>
        {data.ownedBy && <UserAvatar user={data.ownedBy} />}
      </Card.Header>
      <Card.Footer>
        <ButtonBar id={data.id} />
      </Card.Footer>
    </Card>
  );
}
