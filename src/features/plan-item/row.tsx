import { PlanDot } from "@/components/plan-dot";
import {
  DirectoryPlan,
  useShowsPlanIndicators,
} from "@/features/plan-directory";
import { FragmentType } from "@apollo/client";
import { useFragment } from "@apollo/client/react";
import {
  PlanItemFragment,
  PlanItemFragmentDoc,
} from "./__generated__/planItem.generated";
import { NoChip } from "./chips";

/** One step of the ancestry beneath a plan item. */
export type RowAncestor = {
  readonly id: string;
  readonly name: string;
};

type PlanItemRowProps = {
  readonly item: FragmentType<PlanItemFragment>;
  /** Nearest first, the plan itself left out. */
  readonly ancestors: readonly RowAncestor[];
  readonly plan: DirectoryPlan;
};

const STEP_SEPARATOR = " / ";

/**
 * I show a plan item first, then, beneath it, where it sits: its ancestors,
 * nearest first, and its plan when there are plans to tell apart.
 */
export function PlanItemRow({ item, ancestors, plan }: PlanItemRowProps) {
  const showsPlan = useShowsPlanIndicators();
  const { data, complete } = useFragment({
    fragment: PlanItemFragmentDoc,
    fragmentName: "planItem",
    from: item,
  });

  if (!complete) return null;

  const ancestry = ancestors.map((it) => it.name).join(STEP_SEPARATOR);
  return (
    <div className="flex flex-col">
      <span className="flex items-start gap-xs">
        {data.quantity?.quantity === 0 ? <NoChip /> : null}
        <span>{data.name}</span>
      </span>
      {ancestry || showsPlan ? (
        <small>
          {ancestry}
          {ancestry && showsPlan ? STEP_SEPARATOR : null}
          {showsPlan ? (
            <>
              <PlanDot plan={plan} className="me-xxs" />
              {plan.name}
            </>
          ) : null}
        </small>
      ) : null}
    </div>
  );
}
