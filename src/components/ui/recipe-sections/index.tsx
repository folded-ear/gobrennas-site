import { IngredientsAndDirections } from "@/components/ui/ingredients-and-directions";
import { RECIPE_SECTIONS_FRAGMENT } from "@/components/ui/recipe-sections/fragment";
import { FragmentType } from "@apollo/client";
import { useFragment } from "@apollo/client/react";
import { Separator } from "@heroui/react";
import { Fragment } from "react";
import { IngredientsAndDirectionsFragment } from "../ingredients-and-directions/__generated__/fragment.generated";
import { RecipeSectionsFragment } from "./__generated__/fragment.generated";

type RecipeSectionsProps = {
  recipe: FragmentType<RecipeSectionsFragment>;
};

export function RecipeSections({ recipe }: RecipeSectionsProps) {
  const { data } = useFragment({
    fragment: RECIPE_SECTIONS_FRAGMENT,
    fragmentName: "recipeSections",
    from: recipe,
  });
  if (!data?.sections || data.sections.length == 0) return null;
  return (
    <>
      <hr />
      Sections:
      <hr />
      {data.sections.map(
        (s, i) =>
          s && (
            <Fragment key={i}>
              <Separator />
              <h3 className="text-lg">{s.name}</h3>
              <IngredientsAndDirections
                parent={s as FragmentType<IngredientsAndDirectionsFragment>}
              />
            </Fragment>
          ),
      )}
    </>
  );
}
