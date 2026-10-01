import { IngredientsAndDirections } from "@/features/recipe-ingredients-and-directions";
import { RecipeSection } from "@/features/recipe-ingredients-and-directions/content";
import { FragmentType } from "@apollo/client";
import { useFragment } from "@apollo/client/react";
import {
  RecipeSectionsFragment,
  RecipeSectionsFragmentDoc,
} from "./__generated__/recipeSections.generated";

type RecipeSectionsProps = {
  recipe: FragmentType<RecipeSectionsFragment>;
};

export function RecipeSections({ recipe }: RecipeSectionsProps) {
  const { data, complete } = useFragment({
    fragment: RecipeSectionsFragmentDoc,
    fragmentName: "recipeSections",
    from: recipe,
  });
  if (!complete || data.sections.length === 0) return null;
  return (
    <>
      {data.sections.map((section, index) => (
        <RecipeSection key={`${section.id}:${index}`} title={section.name}>
          <IngredientsAndDirections parent={section} headingLevel={3} />
        </RecipeSection>
      ))}
    </>
  );
}
