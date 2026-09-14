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
import { buildPlanContext } from "@/features/plan-timeline/context";
import { buildSubtree } from "@/features/plan-timeline/model";
import { TimelineSkeleton } from "@/features/plan-timeline/skeleton";
import { useHistoryState } from "@/hooks/use-history-state";
import { orderPlans } from "@/lib/plans";
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
  const shownPlans = useMemo(
    () => orderPlans(plans).filter((plan) => planIds.includes(plan.id)),
    [plans, planIds],
  );
  const timelinePlans = useMemo(
    () =>
      shownPlans.map((plan) => ({
        rootIds: plan.children.map((it) => it.id),
        items: plan.descendants,
        buckets: plan.buckets,
      })),
    [shownPlans],
  );
  const items = useMemo(
    () => shownPlans.flatMap((plan) => plan.descendants),
    [shownPlans],
  );
  const selected = items.find((it) => it.id === openItem.value);
  // A closing screen slides away still showing its item, not an empty panel.
  const [shownId, setShownId] = useState(openItem.value);
  if (openItem.value !== undefined && openItem.value !== shownId) {
    setShownId(openItem.value);
  }
  const shown = items.find((it) => it.id === shownId);
  const descendants = useMemo(
    () => (shown ? buildSubtree(items, shown.id) : []),
    [items, shown],
  );
  const tree = useMemo(
    () =>
      buildPlanTree(shownPlans.flatMap((plan) => [plan, ...plan.descendants])),
    [shownPlans],
  );
  const context = useMemo(
    () => buildPlanContext({ plans: timelinePlans }),
    [timelinePlans],
  );
  const moves = usePlanMoves({ plans: shownPlans, tree });
  const changeable = new Set(
    shownPlans.filter(canChangePlan).map((plan) => plan.id),
  );
  const dnd: PlanDnd = {
    tree,
    canMove: (itemId) => {
      const plan = directory.planOfItem.get(itemId);
      return plan !== undefined && changeable.has(plan.id);
    },
    moves,
  };

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
          />
        ) : null}
      </Screen>

      <div className="p-md">
        {shownPlans.length > 0 ? (
          <PlanTimeline
            plans={timelinePlans}
            openId={selected?.id}
            onSelect={openItem.push}
            dnd={dnd}
          />
        ) : (
          <p>There are no plans to show.</p>
        )}
      </div>
    </PlanDirectoryProvider>
  );
}
