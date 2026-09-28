import { PlanItemStatus } from "@/__generated__/graphql";
import { PlanDot } from "@/components/plan-dot";
import {
  DirectoryPlan,
  useShowsPlanIndicators,
} from "@/features/plan-directory";
import {
  StatusButton,
  TOGGLE_LOOKS,
  ToggleStatus,
} from "@/features/plan-status";
import { FragmentType } from "@apollo/client";
import { useFragment } from "@apollo/client/react";
import { Fragment } from "react";
import {
  PlanItemFragment,
  PlanItemFragmentDoc,
} from "./__generated__/planItem.generated";
import { NoChip } from "./chips";

/** One step of the ancestry beneath a plan item. */
export type RowAncestor = {
  readonly id: string;
  readonly name: string;
  /** Whether I count as acquired, and so everything under me does. */
  readonly acquired: boolean;
};

type PlanItemRowProps = {
  readonly item: FragmentType<PlanItemFragment>;
  /** Nearest first, the plan itself left out. */
  readonly ancestors: readonly RowAncestor[];
  readonly plan: DirectoryPlan;
  /** The status my item counts as, whatever its own. */
  readonly countsAs: ToggleStatus;
};

const STEP_SEPARATOR = " / ";
const ACQUIRED_CLASS_NAME = TOGGLE_LOOKS[PlanItemStatus.ACQUIRED].className;

/**
 * I show a plan item first, then, beneath it, where it sits: its ancestors,
 * nearest first, and its plan when there are plans to tell apart. Its
 * status takes the color of the one it counts as, as do acquired ancestors.
 */
export function PlanItemRow({
  item,
  ancestors,
  plan,
  countsAs,
}: PlanItemRowProps) {
  const showsPlan = useShowsPlanIndicators();
  const { data, complete } = useFragment({
    fragment: PlanItemFragmentDoc,
    fragmentName: "planItem",
    from: item,
  });

  if (!complete) return null;

  const ancestry = ancestors.map((it, i) => (
    <Fragment key={it.id}>
      {i > 0 ? STEP_SEPARATOR : null}
      {it.acquired ? (
        <span className={ACQUIRED_CLASS_NAME}>{it.name}</span>
      ) : (
        it.name
      )}
    </Fragment>
  ));
  const hasAncestry = ancestors.length > 0;
  return (
    <div className="flex items-start gap-xs">
      <StatusButton
        itemId={data.id}
        planId={plan.id}
        canChange={plan.changeable}
        countsAs={countsAs}
      />
      <div className="flex flex-col">
        <span className="flex items-start gap-xs">
          {data.quantity?.quantity === 0 ? <NoChip /> : null}
          <span>{data.name}</span>
        </span>
        {hasAncestry || showsPlan ? (
          <small>
            {ancestry}
            {hasAncestry && showsPlan ? STEP_SEPARATOR : null}
            {showsPlan ? (
              <>
                <PlanDot plan={plan} className="me-xxs" />
                {plan.name}
              </>
            ) : null}
          </small>
        ) : null}
      </div>
    </div>
  );
}
