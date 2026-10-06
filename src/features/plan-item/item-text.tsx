import { IngredientRefText } from "@/components/ingredient-ref-text";
import { planItemParts } from "@/lib/ingredient-parts";
import { FragmentType } from "@apollo/client";
import { useFragment } from "@apollo/client/react";
import {
  PlanItemTextFragment,
  PlanItemTextFragmentDoc,
} from "./__generated__/planItemText.generated";

type ItemTextProps = {
  readonly item: FragmentType<PlanItemTextFragment>;
};

/** I show a plan item as its saved parts. */
export function ItemText({ item }: ItemTextProps) {
  const { data, complete } = useFragment({
    fragment: PlanItemTextFragmentDoc,
    fragmentName: "planItemText",
    from: item,
  });
  if (!complete) return null;
  return <IngredientRefText {...planItemParts(data)} />;
}
