import { FragmentType } from "@apollo/client";
import { useFragment } from "@apollo/client/react";
import {
  PlanItemFragment,
  PlanItemFragmentDoc,
} from "./__generated__/planItem.generated";
import { ItemName } from "./item-name";

type PlanItemProps = {
  item: FragmentType<PlanItemFragment>;
  onSelect?: (id: string) => void;
  highlightIngredient?: boolean;
};

export function PlanItem({
  item,
  onSelect,
  highlightIngredient = false,
}: PlanItemProps) {
  const { data, complete } = useFragment({
    fragment: PlanItemFragmentDoc,
    fragmentName: "planItem",
    from: item,
  });

  if (!complete) return null;

  // A click that does nothing shouldn't offer itself as one.
  if (!onSelect) {
    return (
      <span>
        <ItemName itemId={data.id} highlightIngredient={highlightIngredient} />
      </span>
    );
  }

  return (
    <button
      type="button"
      className="cursor-pointer text-left hover:text-accent"
      onClick={() => onSelect(data.id)}
    >
      <ItemName itemId={data.id} />
    </button>
  );
}
