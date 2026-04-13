"use client";

import { GetPlansDocument } from "@/features/planner/__generated__/getPlans.generated";
import { PlanItem } from "@/features/planner/plan-item";
import { usePreference } from "@/hooks/use-preference";
import { PREF_ACTIVE_PLAN } from "@/lib/preferences";
import { useSuspenseQuery } from "@apollo/client/react";

export function Planner() {
  const { data } = useSuspenseQuery(GetPlansDocument);

  const activePlanId = usePreference(PREF_ACTIVE_PLAN);
  const plan = data.planner.plans.find((p) => p.id === activePlanId);

  if (!plan)
    return (
      <div className="flex flex-col gap-sm">
        <p>No active plan found. Please select a plan from the sidebar.</p>
      </div>
    );

  return <PlanItem planItems={plan.descendants} />;
}
