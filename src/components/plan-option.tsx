import PlanAvatar from "@/components/plan-avatar";
import { Description, Label } from "@heroui/react";

/** A plan as an option lists it. */
export type OptionPlan = {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly mine: boolean;
};

export const VIEW_ONLY_HINT = "This plan is view only";

/** A titled run of plans. */
export type PlanGroup<P extends OptionPlan> = {
  readonly title: string;
  readonly plans: readonly P[];
};

/**
 * I split plans into the user's own and those shared with them, each in the
 * order given, leaving out a group with no plans.
 */
export function groupPlans<P extends OptionPlan>(
  plans: readonly P[],
): PlanGroup<P>[] {
  return [
    { title: "My Plans", plans: plans.filter((it) => it.mine) },
    { title: "Shared Plans", plans: plans.filter((it) => !it.mine) },
  ].filter((group) => group.plans.length > 0);
}

type PlanOptionProps = {
  plan: OptionPlan;
  /** Whether my plan is selected; if false my avatar is a ring. */
  selected?: boolean;
  /** Whether my plan can't be chosen; if so I say it's view only. */
  disabled?: boolean;
};

/** I show a plan inside a list or menu item: its avatar and its name. */
export function PlanOption({
  plan,
  selected = true,
  disabled = false,
}: PlanOptionProps) {
  return (
    <>
      <PlanAvatar plan={plan} selected={selected} size="sm" aria-hidden />
      <div className="flex flex-col">
        <Label>{plan.name}</Label>
        {disabled ? <Description>{VIEW_ONLY_HINT}</Description> : null}
      </div>
    </>
  );
}
