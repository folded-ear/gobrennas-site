"use client";

import { ButtonBar } from "@/components/ui/button-bar";
import { RecipePhoto } from "@/components/ui/recipe-photo";
import { fragmentRegistry } from "@/lib/apollo/fragment-registry";
import { FragmentType, gql, TypedDocumentNode } from "@apollo/client";
import { useFragment } from "@apollo/client/react";
import { Card } from "@heroui/react";
import Link from "next/link";
import { RecipeCardFragment } from "./__generated__/recipe-card.generated";

const RECIPE_CARD_FRAGMENT: TypedDocumentNode<RecipeCardFragment> = gql`
  fragment recipeCard on Recipe {
    id
    photo {
      url
      focus
    }
    name
  }
`;

fragmentRegistry.register(RECIPE_CARD_FRAGMENT);

type RecipeCardProps = {
  recipe: FragmentType<RecipeCardFragment>;
};

export function RecipeCard({ recipe }: RecipeCardProps) {
  const { data, complete } = useFragment({
    fragment: RECIPE_CARD_FRAGMENT,
    from: recipe,
  });

  if (!complete) return <h1>Ain&apos;t got not data, yo!</h1>;

  return (
    <Card>
      <RecipePhoto
        photo={data.photo ?? undefined}
        alt={data.name}
        className="opacity-20"
      />
      <Card.Header className="z-10">
        <Card.Title className="text-xl text-shadow-white text-shadow-lg/40">
          <Link href={`/recipes/${data.id}`} className="hover:underline">
            {data.name}
          </Link>
        </Card.Title>
      </Card.Header>
      <Card.Footer>
        <ButtonBar id={data.id} />
      </Card.Footer>
    </Card>
  );
}
