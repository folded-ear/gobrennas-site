import { PlanItemNode } from "@/features/plan-timeline/model";
import { FragmentType } from "@apollo/client";
import { useFragment } from "@apollo/client/react";
import {
  PlanItemFragment,
  PlanItemFragmentDoc,
} from "./__generated__/planItem.generated";
import { PlanItemTree } from "./tree";

type PlanItemDetailProps = {
  item: FragmentType<PlanItemFragment>;
  /** Everything below the item, however deep and whatever its dates. */
  descendants: readonly PlanItemNode[];
  onSelect?: (id: string) => void;
};

export function PlanItemDetail({
  item,
  descendants,
  onSelect,
}: PlanItemDetailProps) {
  const { data, complete } = useFragment({
    fragment: PlanItemFragmentDoc,
    fragmentName: "planItem",
    from: item,
  });

  if (!complete) return null;

  return (
    <div className="flex flex-col gap-sm">
      <h2 className="text-xl font-semibold text-foreground">{data.name}</h2>
      {data.notes ? <p className="text-sm text-muted">{data.notes}</p> : null}
      <PlanItemTree nodes={descendants} onSelect={onSelect} />
    </div>
  );
}
