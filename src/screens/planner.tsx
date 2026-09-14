"use client";

import { Screen } from "@/components/screen";
import { SectionHeader } from "@/components/section-header";
import {
  buildPlanDirectory,
  PlanDirectoryProvider,
} from "@/features/plan-directory";
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
import { useMemo, useState } from "react";

// Only the viewer's browser knows the viewer's date, so the timeline never
// renders on the server.
const PlanTimeline = dynamic(
  () => import("@/features/plan-timeline").then((m) => m.PlanTimeline),
  { ssr: false, loading: () => <TimelineSkeleton /> },
);

// The open item rides its own history entry, so going back closes it.
const OPEN_ITEM_KEY = "planItem";

// Stands in while there's no plan, when nothing is shown to move anyway.
const NO_PLAN_TREE = buildPlanTree([]);
const NO_PLAN_CONTEXT: PlanContext = new Map();

export function Planner() {
  const { data } = useSuspenseQuery(PlannerDocument);
  const openItem = useHistoryState<string>(OPEN_ITEM_KEY);

  const plans = data.planner.plans;
  const directory = useMemo(() => buildPlanDirectory(plans), [plans]);
  const [planIds, setPlanIds] = usePlanSelection(
    PREF_PLANNER_PLANS,
    plans,
    "multiple",
  );
  // Merging selected plans into one timeline is yet to come; until then the
  // first one stands for them all.
  const plan = plans.find((p) => p.id === planIds[0]);
  const selected = plan?.descendants.find((it) => it.id === openItem.value);
  // A closing screen slides away still showing its item, not an empty panel.
  const [shownId, setShownId] = useState(openItem.value);
  if (openItem.value !== undefined && openItem.value !== shownId) {
    setShownId(openItem.value);
  }
  const shown = plan?.descendants.find((it) => it.id === shownId);
  const rootIds = useMemo(
    () => plan?.children.map((it) => it.id) ?? [],
    [plan],
  );
  const descendants = useMemo(
    () => (shown ? buildSubtree(plan?.descendants ?? [], shown.id) : []),
    [plan, shown],
  );
  const tree = useMemo(
    () => (plan ? buildPlanTree([plan, ...plan.descendants]) : NO_PLAN_TREE),
    [plan],
  );
  const context = useMemo(
    () =>
      plan
        ? buildPlanContext({
            plans: [
              { rootIds, items: plan.descendants, buckets: plan.buckets },
            ],
          })
        : NO_PLAN_CONTEXT,
    [plan, rootIds],
  );
  const movePlans = useMemo(() => (plan ? [plan] : []), [plan]);
  const moves = usePlanMoves({ plans: movePlans, tree });
  const dnd: PlanDnd | undefined = plan
    ? { tree, canMove: () => canChangePlan(plan), moves }
    : undefined;

  return (
    <PlanDirectoryProvider directory={directory}>
      <SectionHeader title="Planner">
        <PlanPicker
          label="Plans"
          plans={plans}
          selectionMode="multiple"
          selectedIds={planIds}
          onChange={setPlanIds}
        />
      </SectionHeader>
      <Screen label={shown?.name ?? ""} isOpen={selected !== undefined}>
        {shown ? (
          <PlanItemDetail
            item={shown}
            context={context}
            descendants={descendants}
            onSelect={openItem.replace}
            dnd={dnd}
            planId={plan?.id}
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
            planId={plan.id}
          />
        ) : (
          <p>There are no plans to show.</p>
        )}
      </div>
    </PlanDirectoryProvider>
  );
}
