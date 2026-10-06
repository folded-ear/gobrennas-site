import type { IngredientParts } from "@/lib/ingredient-parts";
import { humanQuantity } from "@/lib/quantity";

/** Morsel's text treatment, without editor behavior or focus targets. */
export function IngredientRefText({
  text,
  quantity,
  unit,
  name,
  preparation,
}: IngredientParts) {
  return (
    <span className="morsel-text">
      {quantity !== undefined ? (
        <>
          <span className="morsel-quantity">
            {humanQuantity(quantity)}
          </span>{" "}
        </>
      ) : null}
      {unit ? (
        <>
          <span className="morsel-unit">{unit}</span>{" "}
        </>
      ) : null}
      {name ? <span className="morsel-ingredient">{name}</span> : text}
      {name && preparation ? `, ${preparation}` : null}
    </span>
  );
}
