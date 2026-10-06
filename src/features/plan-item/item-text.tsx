import { IngredientRefText } from "@/components/ingredient-ref-text";
import { planItemParts } from "@/lib/ingredient-parts";
import { useFragment } from "@apollo/client/react";
import { PlanItemTextFragmentDoc } from "./__generated__/planItemText.generated";

type ItemTextProps = {
  readonly itemId: string;
};

/** I show a plan item as its saved parts. */
export function ItemText({ itemId }: ItemTextProps) {
  const { data, complete } = useFragment({
    fragment: PlanItemTextFragmentDoc,
    from: { __typename: "PlanItem", id: itemId },
  });
  if (!complete) return null;
  return <IngredientRefText {...planItemParts(data)} />;
}
