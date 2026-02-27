"use client";

import { SendToPlan } from "@/components/ui/icons";
import { IngredientsAndDirections } from "@/components/ui/ingredients-and-directions";
import { RecipePhoto } from "@/components/ui/recipe-photo";
import { RecipeSections } from "@/components/ui/recipe-sections";
import { OtherUserAvatar } from "@/components/ui/user-avatar";
import { useSuspenseQuery } from "@apollo/client/react";
import { Button } from "@heroui/react";
import { GetRecipeDetailDocument } from "./__generated__/getRecipeDetail.generated";

type RecipeDetailProps = {
  id: string;
};

export function RecipeDetail({ id }: RecipeDetailProps) {
  const { data } = useSuspenseQuery(GetRecipeDetailDocument, {
    variables: { id },
  });

  const recipe = data.library.getRecipeById;

  return (
    <div className="flex flex-col gap-1">
      <div className="w-full flex justify-between">
        <div className="flex gap-1">
          <OtherUserAvatar user={recipe.ownedBy} />
          <h2 className="text-xl">{recipe.name}</h2>
        </div>
        <Button onClick={() => alert("send it!")}>
          <SendToPlan />
        </Button>
      </div>
      {recipe.photo && (
        <div className="relative min-h-80">
          <RecipePhoto recipe={recipe} loading="eager" />
        </div>
      )}
      <div className="flex flex-col gap-sm">
        <IngredientsAndDirections parent={recipe} />
      </div>
      <RecipeSections recipe={recipe} />
    </div>
  );
}
