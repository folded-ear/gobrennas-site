"use client";

import { canChangePlan } from "@/lib/plans";
import { useFragment } from "@apollo/client/react";
import { PlanManagementFragmentDoc } from "./__generated__/management.generated";
import { PlanSettingsForm } from "./settings-form";

export { CreatePlanDialog, PlannerWelcome } from "./create-plan";
export { PlanManagementList } from "./plan-list";

export function PlanManagement({
  plan: reference,
  onLeave,
  onBack,
}: {
  plan: { __typename?: "Plan"; id: string };
  onLeave: () => void;
  onBack?: () => void;
}) {
  const { data: plan, complete } = useFragment({
    fragment: PlanManagementFragmentDoc,
    fragmentName: "planManagement",
    from: reference,
  });
  if (!complete || !canChangePlan(plan))
    return <p>This plan is no longer available to manage.</p>;
  return (
    <PlanSettingsForm
      key={plan.id}
      plan={plan}
      onLeave={onLeave}
      onBack={onBack}
    />
  );
}
