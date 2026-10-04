import { isBlankName, UNNAMED } from "@/lib/plan-item-name";
import { useFragment } from "@apollo/client/react";
import { PlanItemNameFragmentDoc } from "./__generated__/planItemName.generated";
import { IngredientName } from "./ingredient-name";

type NameTextProps = {
  readonly name: string;
};

type ItemNameProps = {
  readonly itemId: string;
  readonly highlightIngredient?: boolean;
};

/** I show a name, or a blank one as a lighter, italic Unnamed. */
export function NameText({ name }: NameTextProps) {
  if (isBlankName(name)) {
    return <span className="font-light text-muted italic">{UNNAMED}</span>;
  }
  return <>{name}</>;
}

/** I show a plan item's name, its ingredient highlighted if asked. */
export function ItemName({
  itemId,
  highlightIngredient = false,
}: ItemNameProps) {
  const { data, complete } = useFragment({
    fragment: PlanItemNameFragmentDoc,
    from: { __typename: "PlanItem", id: itemId },
  });
  if (!complete) return null;
  return highlightIngredient && !isBlankName(data.name) ? (
    <IngredientName name={data.name} />
  ) : (
    <NameText name={data.name} />
  );
}
