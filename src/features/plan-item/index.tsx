import { FragmentType } from "@apollo/client";
import { useFragment } from "@apollo/client/react";
import {
  PlanItemFragment,
  PlanItemFragmentDoc,
} from "./__generated__/planItem.generated";

type PlanItemProps = {
  planItems: FragmentType<PlanItemFragment>[];
  onSelect?: (id: string) => void;
};

export function PlanItem({ planItems, onSelect }: PlanItemProps) {
  const { data: items } = useFragment({
    fragment: PlanItemFragmentDoc,
    fragmentName: "planItem",
    from: planItems,
  });

  return (
    <ul>
      {items.map((item) => {
        const id = item?.id;
        if (!id) return null;
        return (
          <li key={id}>
            <button type="button" onClick={() => onSelect?.(id)}>
              {item.name}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
