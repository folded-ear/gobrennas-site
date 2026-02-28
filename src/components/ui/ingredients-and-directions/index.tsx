import { FragmentType } from "@apollo/client";
import { useFragment } from "@apollo/client/react";
import { Fragment, useMemo, useState } from "react";
import {
  IngredientsAndDirectionsFragment,
  IngredientsAndDirectionsFragmentDoc,
} from "./__generated__/ingredientsAndDirections.generated";

type IngredientsAndDirectionsProps = {
  parent: FragmentType<IngredientsAndDirectionsFragment>;
};

export function IngredientsAndDirections({
  parent,
}: IngredientsAndDirectionsProps) {
  const [scale, setScale] = useState(1);
  const { data, complete } = useFragment({
    fragment: IngredientsAndDirectionsFragmentDoc,
    from: parent,
  });

  const { directions, ingredients } = useMemo(
    () =>
      complete
        ? {
            directions: data.directions,
            ingredients: data.ingredients.map((ing) => ({
              raw: ing.raw,
              quantity: ing.quantity?.quantity,
              units: ing.quantity?.units?.name,
              ingredient: ing.ingredient?.name,
              preparation: ing.preparation,
            })),
          }
        : { ingredients: [] },
    [data, complete],
  );

  if (!complete) return null;

  return (
    <div className="flex flex-col gap-md sm:flex-row">
      <div className="flex-1 flex-col gap-md">
        <div className="flex gap-md">
          Scale:
          <input
            type={"number"}
            step={1}
            value={scale}
            onChange={(e) => setScale(parseInt(e.target.value) || 0)}
            min={0}
            className="w-10"
          />
        </div>
        <div className="grid grid-cols-[1fr_2fr] gap-md">
          {ingredients.map((ing, i) => (
            <Fragment key={i}>
              <div className="text-right text-nowrap">
                {ing.quantity == null ? (
                  ""
                ) : (
                  <>
                    {scale * ing.quantity} {ing.units}
                  </>
                )}
              </div>
              <div>
                {ing.quantity == null ? (
                  ing.raw
                ) : (
                  <>
                    {ing.ingredient} {ing.preparation}
                  </>
                )}
              </div>
            </Fragment>
          ))}
        </div>
      </div>
      <div className="flex-2">{directions}</div>
    </div>
  );
}
