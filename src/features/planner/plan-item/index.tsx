import { FragmentType } from "@apollo/client";
import { useFragment } from "@apollo/client/react";
import {
  PlanItemFragment,
  PlanItemFragmentDoc,
} from "./__generated__/planItem.generated";

type PlanItemProps = {
  planItems: FragmentType<PlanItemFragment>[];
};

export function PlanItem({ planItems }: PlanItemProps) {
  const { data: items, complete } = useFragment({
    fragment: PlanItemFragmentDoc,
    fragmentName: "planItem",
    from: planItems,
  });

  return (
    <ul>
      {items.map((item) =>
        item ? <li key={item.id}>- {item.name}</li> : null,
      )}
    </ul>
  );
}
