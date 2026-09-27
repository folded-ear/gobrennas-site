import { PlanDot } from "@/components/plan-dot";
import {
  DirectoryPlan,
  useShowsPlanIndicators,
} from "@/features/plan-directory";
import { EditableName } from "@/features/plan-edit";
import { StatusButton, useItemStatus } from "@/features/plan-status";
import { FragmentType } from "@apollo/client";
import { useFragment } from "@apollo/client/react";
import { Fragment, ReactNode } from "react";
import {
  PlanItemFragment,
  PlanItemFragmentDoc,
} from "./__generated__/planItem.generated";
import { NoChip } from "./chips";
import { ItemName, NameText } from "./item-name";

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
  /** The list I'm shown in, which a new item made from me joins. */
  readonly group?: string;
};

const STEP_SEPARATOR = " / ";

/**
 * I show a plan item first, then, beneath it, where it sits: its ancestors,
 * nearest first, and its plan when there are plans to tell apart.
 */
export function PlanItemRow({
  item,
  ancestors,
  plan,
  group,
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
      <NameText name={it.name} />
    </Fragment>
  ));
  return (
    <div className="flex items-start gap-xs">
      <StatusButton
        itemId={data.id}
        planId={plan.id}
        canChange={plan.changeable}
      />
      <RowName
        itemId={data.id}
        name={data.name}
        plan={plan}
        group={group}
        below={
          ancestors.length > 0 || showsPlan ? (
            <small>
              {ancestry}
              {ancestors.length > 0 && showsPlan ? STEP_SEPARATOR : null}
              {showsPlan ? (
                <>
                  <PlanDot plan={plan} className="me-xxs" />
                  {plan.name}
                </>
              ) : null}
            </small>
          ) : null
        }
      >
        {data.quantity?.quantity === 0 ? <NoChip /> : null}
        <span>
          <ItemName itemId={data.id} />
        </span>
      </RowName>
    </div>
  );
}

type RowNameProps = {
  readonly itemId: string;
  readonly name: string;
  readonly plan: DirectoryPlan;
  readonly group?: string;
  readonly below: ReactNode;
  readonly children: ReactNode;
};

/** I am a row's name and where it sits, edited in place when it can be. */
function RowName({ itemId, name, plan, group, below, children }: RowNameProps) {
  const status = useItemStatus(itemId);
  return (
    <EditableName
      itemId={itemId}
      planId={plan.id}
      name={name}
      // The shopping list is made of leaves.
      hasChildren={false}
      canEdit={
        plan.changeable &&
        status !== null &&
        !status.inert &&
        status.pendingStatus === null
      }
      group={group}
      below={below}
    >
      {children}
    </EditableName>
  );
}
