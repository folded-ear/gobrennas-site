"use client";

import { OtherUserAvatar } from "@/features/profile/user-avatar";
import { IngredientsAndDirections } from "@/features/recipes/ingredients-and-directions";
import { RecipePhoto } from "@/features/recipes/photo";
import { RecipeSections } from "@/features/recipes/sections";
import { SendToPlan } from "@/features/send-to-plan";
import { usePreference } from "@/hooks/use-preference";
import { PREF_ACTIVE_PLAN } from "@/lib/preferences";
import { useSuspenseQuery } from "@apollo/client/react";
import { GetRecipeDetailDocument } from "./__generated__/getRecipeDetail.generated";

type RecipeDetailProps = {
  id: string;
};

export function RecipeDetail({ id }: RecipeDetailProps) {
  const activePlanId = usePreference(PREF_ACTIVE_PLAN)!;
  const { data } = useSuspenseQuery(GetRecipeDetailDocument, {
    variables: { id, activePlanId },
  });

  const recipe = data.library.getRecipeById;

  return (
    <div className="flex flex-col gap-1">
      <div className="w-full flex justify-between">
        <div className="flex gap-1">
          <OtherUserAvatar user={recipe.ownedBy} />
          <h2 className="text-xl">{recipe.name}</h2>
        </div>
        <SendToPlan recipeId={recipe.id} activePlanId={activePlanId} />
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
