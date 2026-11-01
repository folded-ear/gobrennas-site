"use client";

import { canChangePlan } from "@/lib/plans";
import { useFragment } from "@apollo/client/react";
import { PlanManagementFragmentDoc } from "./__generated__/management.generated";
import { PlanSettingsForm } from "./settings-form";

export { CreatePlanDialog, PlannerWelcome } from "./create-plan";
export { PlannerPlanBar } from "./plan-bar";
export { PlanManagementList } from "./plan-list";

export function PlanManagement({
  plan: reference,
  onDeleted,
  onBack,
}: {
  plan: { __typename?: "Plan"; id: string };
  onDeleted: () => void;
  onBack?: () => void;
}) {
  const { data: plan, complete } = useFragment({
    fragment: PlanManagementFragmentDoc,
    from: reference,
  });
  if (!complete || !canChangePlan(plan))
    return <p>This plan is no longer available to manage.</p>;
  return (
    <PlanSettingsForm
      key={plan.id}
      plan={plan}
      onDeleted={onDeleted}
      onBack={onBack}
    />
  );
}
