import { FragmentType } from "@apollo/client";
import { useFragment } from "@apollo/client/react";
import type { ReactNode } from "react";
import {
  IngredientsAndDirectionsFragment,
  IngredientsAndDirectionsFragmentDoc,
} from "./__generated__/ingredientsAndDirections.generated";
import { RecipeContent } from "./content";

type IngredientsAndDirectionsProps = {
  parent: FragmentType<IngredientsAndDirectionsFragment>;
  headingLevel?: 2 | 3;
  ingredientHeader?: ReactNode;
};

export function IngredientsAndDirections({
  parent,
  headingLevel,
  ingredientHeader,
}: IngredientsAndDirectionsProps) {
  const { data, complete } = useFragment({
    fragment: IngredientsAndDirectionsFragmentDoc,
    from: parent,
  });

  if (!complete) return null;

  return (
    <RecipeContent
      headingLevel={headingLevel}
      ingredientHeader={ingredientHeader}
      directions={data.directions}
      ingredients={data.ingredients.map((ingredient) => {
        // Use saved recognition, without re-recognizing or modifying the recipe.
        if (!ingredient.ingredient && ingredient.raw.trim())
          return { text: ingredient.raw };
        return {
          text: ingredient.preparation || "Unnamed ingredient",
          quantity: ingredient.quantity?.quantity,
          unit: ingredient.quantity?.units?.name,
          name: ingredient.ingredient?.name,
          preparation: ingredient.preparation ?? undefined,
        };
      })}
    />
  );
}
