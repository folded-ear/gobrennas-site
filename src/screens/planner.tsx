"use client";

import {
  defineDrawer,
  ScreenDrawer,
  useDrawer,
} from "@/components/screen-drawer";
import { PlanItemDetail } from "@/features/plan-item/detail";
import { buildSubtree } from "@/features/plan-timeline/model";
import { TimelineSkeleton } from "@/features/plan-timeline/skeleton";
import { usePreference } from "@/hooks/use-preference";
import { PREF_ACTIVE_PLAN } from "@/lib/preferences";
import { PlannerDocument } from "@/screens/__generated__/planner.generated";
import { useSuspenseQuery } from "@apollo/client/react";
import dynamic from "next/dynamic";
import { PropsWithChildren, useMemo } from "react";

// Only the viewer's browser knows the viewer's date, so the timeline never
// renders on the server. See the notes, section 8.2.
const PlanTimeline = dynamic(
  () => import("@/features/plan-timeline").then((m) => m.PlanTimeline),
  { ssr: false, loading: () => <TimelineSkeleton /> },
);

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
  const rootIds = useMemo(
    () => plan?.children.map((it) => it.id) ?? [],
    [plan],
  );
  const descendants = useMemo(
    () => (selected ? buildSubtree(plan?.descendants ?? [], selected.id) : []),
    [plan, selected],
  );

  function select(itemId: string) {
    drawer.setMemento({ itemId });
    drawer.expand();
  }

  return (
    <Layout>
      <ScreenDrawer drawer={PLANNER_DRAWER}>
        {selected ? (
          <PlanItemDetail
            item={selected}
            descendants={descendants}
            onSelect={select}
          />
        ) : (
          <p>Select a plan item to see it here.</p>
        )}
      </ScreenDrawer>

      {plan ? (
        <PlanTimeline
          rootIds={rootIds}
          items={plan.descendants}
          buckets={plan.buckets}
          onSelect={select}
        />
      ) : (
        <div className="flex flex-col gap-sm">
          <p>No active plan found. Please select a plan from the sidebar.</p>
        </div>
      )}
    </Layout>
  );
}
