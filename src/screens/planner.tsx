"use client";

import { Screen } from "@/components/screen";
import { SectionHeader } from "@/components/section-header";
import { PlanDnd } from "@/features/plan-dnd";
import { buildPlanTree, canChangePlan } from "@/features/plan-dnd/moves";
import { usePlanMoves } from "@/features/plan-dnd/use-plan-moves";
import { PlanItemDetail } from "@/features/plan-item/detail";
import { PlanPicker } from "@/features/plan-picker";
import { usePlanSelection } from "@/features/plan-picker/use-plan-selection";
import {
  buildPlanContext,
  PlanContext,
} from "@/features/plan-timeline/context";
import { buildSubtree } from "@/features/plan-timeline/model";
import { TimelineSkeleton } from "@/features/plan-timeline/skeleton";
import { useHistoryState } from "@/hooks/use-history-state";
import { PREF_PLANNER_PLANS } from "@/lib/preferences";
import { PlannerDocument } from "@/screens/__generated__/planner.generated";
import { useSuspenseQuery } from "@apollo/client/react";
import dynamic from "next/dynamic";
import { useMemo } from "react";

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

export function Planner() {
  const { data } = useSuspenseQuery(PlannerDocument);
  const openItem = useHistoryState<string>(OPEN_ITEM_KEY);

  const plans = data.planner.plans;
  const [planIds, setPlanIds] = usePlanSelection(
    PREF_PLANNER_PLANS,
    plans,
    "multiple",
  );
  // Merging selected plans into one timeline is yet to come; until then the
  // first one stands for them all.
  const plan = plans.find((p) => p.id === planIds[0]);
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
    <>
      <SectionHeader title="Planner">
        <PlanPicker
          label="Plans"
          plans={plans}
          selectionMode="multiple"
          selectedIds={planIds}
          onChange={setPlanIds}
        />
      </SectionHeader>
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

      <div className="p-md">
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
          <p>There are no plans to show.</p>
        )}
      </div>
    </>
  );
}
