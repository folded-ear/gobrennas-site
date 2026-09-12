import { FragmentType } from "@apollo/client";
import { useFragment } from "@apollo/client/react";
import {
  PlanItemFragment,
  PlanItemFragmentDoc,
} from "./__generated__/planItem.generated";

type PlanItemProps = {
  item: FragmentType<PlanItemFragment>;
  onSelect?: (id: string) => void;
};

export function PlanItem({ item, onSelect }: PlanItemProps) {
  const { data, complete } = useFragment({
    fragment: PlanItemFragmentDoc,
    fragmentName: "planItem",
    from: item,
  });

  if (!complete) return null;

  // A click that does nothing shouldn't offer itself as one.
  if (!onSelect) return <span>{data.name}</span>;

  return (
    <button
      type="button"
      className="text-left hover:text-accent"
      onClick={() => onSelect(data.id)}
    >
      {data.name}
    </button>
  );
}
