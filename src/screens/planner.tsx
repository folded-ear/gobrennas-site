"use client";

import { PlanItem } from "@/features/plan-item";
import { usePreference } from "@/hooks/use-preference";
import { PREF_ACTIVE_PLAN } from "@/lib/preferences";
import { PlannerDocument } from "@/screens/__generated__/planner.generated";
import { useSuspenseQuery } from "@apollo/client/react";
import { PropsWithChildren } from "react";

function Layout({ children }: PropsWithChildren) {
  return (
    <div className="bg-surface rounded-md p-md mx-xs">
      <div className="border-b border-divider py-sm flex justify-between">
        <h2 className="text-xl font-semibold text-foreground">Planner</h2>
      </div>
      {children}
    </div>
  );
}

export function Planner() {
  const { data } = useSuspenseQuery(PlannerDocument);

  const activePlanId = usePreference(PREF_ACTIVE_PLAN);
  const plan = data.planner.plans.find((p) => p.id === activePlanId);

  if (!plan)
    return (
      <Layout>
        <div className="flex flex-col gap-sm">
          <p>No active plan found. Please select a plan from the sidebar.</p>
        </div>
      </Layout>
    );

  return (
    <Layout>
      <PlanItem planItems={plan.descendants} />
    </Layout>
  );
}
