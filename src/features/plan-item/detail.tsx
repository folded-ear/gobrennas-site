import { FragmentType } from "@apollo/client";
import { useFragment } from "@apollo/client/react";
import {
  PlanItemFragment,
  PlanItemFragmentDoc,
} from "./__generated__/planItem.generated";

type PlanItemDetailProps = {
  item: FragmentType<PlanItemFragment>;
};

export function PlanItemDetail({ item }: PlanItemDetailProps) {
  const { data, complete } = useFragment({
    fragment: PlanItemFragmentDoc,
    fragmentName: "planItem",
    from: item,
  });

  if (!complete) return null;

  return <h2 className="text-xl font-semibold text-foreground">{data.name}</h2>;
}
