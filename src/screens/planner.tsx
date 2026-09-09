"use client";

import {
  defineDrawer,
  ScreenDrawer,
  useDrawer,
} from "@/components/screen-drawer";
import { PlanItem } from "@/features/plan-item";
import { PlanItemDetail } from "@/features/plan-item/detail";
import { usePreference } from "@/hooks/use-preference";
import { PREF_ACTIVE_PLAN } from "@/lib/preferences";
import { PlannerDocument } from "@/screens/__generated__/planner.generated";
import { useSuspenseQuery } from "@apollo/client/react";
import { PropsWithChildren } from "react";

type PlannerMemento = {
  itemId: string;
};

const PLANNER_DRAWER = defineDrawer<PlannerMemento>({
  id: "planner",
  defaultExpanded: false,
});

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
  const drawer = useDrawer(PLANNER_DRAWER);

  const activePlanId = usePreference(PREF_ACTIVE_PLAN);
  const plan = data.planner.plans.find((p) => p.id === activePlanId);
  const selected = plan?.descendants.find(
    (it) => it.id === drawer.memento?.itemId,
  );

  return (
    <Layout>
      <ScreenDrawer drawer={PLANNER_DRAWER}>
        {selected ? (
          <PlanItemDetail item={selected} />
        ) : (
          <p>Select a plan item to see it here.</p>
        )}
      </ScreenDrawer>

      {plan ? (
        <PlanItem
          planItems={plan.descendants}
          onSelect={(itemId) => {
            drawer.setMemento({ itemId });
            drawer.expand();
          }}
        />
      ) : (
        <div className="flex flex-col gap-sm">
          <p>No active plan found. Please select a plan from the sidebar.</p>
        </div>
      )}
    </Layout>
  );
}
