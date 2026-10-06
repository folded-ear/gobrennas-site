import { PlanItemStatus } from "@/__generated__/graphql";
import { PlanDot } from "@/components/plan-dot";
import {
  DirectoryPlan,
  useShowsPlanIndicators,
} from "@/features/plan-directory";
import { EditableName } from "@/features/plan-edit";
import {
  StatusButton,
  TOGGLE_LOOKS,
  ToggleStatus,
  useItemStatus,
} from "@/features/plan-status";
import { FragmentType } from "@apollo/client";
import { useFragment } from "@apollo/client/react";
import { Fragment, ReactNode } from "react";
import {
  PlanItemFragment,
  PlanItemFragmentDoc,
} from "./__generated__/planItem.generated";
import { NoChip } from "./chips";
import { NameText } from "./item-name";
import { ItemText } from "./item-text";

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
  /** The list I'm shown in, which a new item made from me joins. */
  readonly group?: string;
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
  group,
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
        <span className={ACQUIRED_CLASS_NAME}>
          <NameText name={it.name} />
        </span>
      ) : (
        <NameText name={it.name} />
      )}
    </Fragment>
  ));
  return (
    <div className="flex items-start gap-xs">
      <StatusButton
        itemId={data.id}
        planId={plan.id}
        canChange={plan.changeable}
        countsAs={countsAs}
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
          <ItemText itemId={data.id} />
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
