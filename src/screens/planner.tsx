"use client";

import { Screen } from "@/components/screen";
import { PlanDnd } from "@/features/plan-dnd";
import { buildPlanTree, canChangePlan } from "@/features/plan-dnd/moves";
import { usePlanMoves } from "@/features/plan-dnd/use-plan-moves";
import { PlanItemDetail } from "@/features/plan-item/detail";
import {
  buildPlanContext,
  PlanContext,
} from "@/features/plan-timeline/context";
import { buildSubtree } from "@/features/plan-timeline/model";
import { TimelineSkeleton } from "@/features/plan-timeline/skeleton";
import { useHistoryState } from "@/hooks/use-history-state";
import { usePreference } from "@/hooks/use-preference";
import { PREF_ACTIVE_PLAN } from "@/lib/preferences";
import { PlannerDocument } from "@/screens/__generated__/planner.generated";
import { useSuspenseQuery } from "@apollo/client/react";
import dynamic from "next/dynamic";
import { PropsWithChildren, useMemo } from "react";

// Only the viewer's browser knows the viewer's date, so the timeline never
// renders on the server.
const PlanTimeline = dynamic(
  () => import("@/features/plan-timeline").then((m) => m.PlanTimeline),
  { ssr: false, loading: () => <TimelineSkeleton /> },
);

// The open item rides its own history entry, so going back closes it.
const OPEN_ITEM_KEY = "planItem";

// Stands in while there's no plan, when nothing is shown to move anyway.
const NO_PLAN_TREE = buildPlanTree({ id: "", children: [] }, []);
const NO_PLAN_CONTEXT: PlanContext = new Map();

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
  const openItem = useHistoryState<string>(OPEN_ITEM_KEY);

  const activePlanId = usePreference(PREF_ACTIVE_PLAN);
  const plan = data.planner.plans.find((p) => p.id === activePlanId);
  const selected = plan?.descendants.find((it) => it.id === openItem.value);
  const rootIds = useMemo(
    () => plan?.children.map((it) => it.id) ?? [],
    [plan],
  );
  const descendants = useMemo(
    () => (selected ? buildSubtree(plan?.descendants ?? [], selected.id) : []),
    [plan, selected],
  );
  const tree = useMemo(
    () => (plan ? buildPlanTree(plan, plan.descendants) : NO_PLAN_TREE),
    [plan],
  );
  const context = useMemo(
    () =>
      plan
        ? buildPlanContext({
            rootIds,
            items: plan.descendants,
            buckets: plan.buckets,
          })
        : NO_PLAN_CONTEXT,
    [plan, rootIds],
  );
  const moves = usePlanMoves({
    planId: plan?.id ?? "",
    tree,
    buckets: plan?.buckets ?? [],
  });
  const dnd: PlanDnd | undefined = plan
    ? { tree, canMove: canChangePlan(plan), moves }
    : undefined;

  return (
    <Layout>
      <Screen label={selected?.name ?? ""} isOpen={selected !== undefined}>
        {selected ? (
          <PlanItemDetail
            item={selected}
            context={context}
            descendants={descendants}
            onSelect={openItem.replace}
            dnd={dnd}
          />
        ) : null}
      </Screen>

      {plan ? (
        <PlanTimeline
          rootIds={rootIds}
          items={plan.descendants}
          buckets={plan.buckets}
          openId={selected?.id}
          onSelect={openItem.push}
          dnd={dnd}
        />
      ) : (
        <div className="flex flex-col gap-sm">
          <p>No active plan found. Please select a plan from the sidebar.</p>
        </div>
      )}
    </Layout>
  );
}
