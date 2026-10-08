"use client";

import { SectionHeader } from "@/components/section-header";
import { useWatchPlans } from "@/features/page-engine";
import {
  buildPlanDirectory,
  PlanDirectoryProvider,
} from "@/features/plan-directory";
import { buildPlanTree } from "@/features/plan-dnd/moves";
import { PlanPicker } from "@/features/plan-picker";
import { usePlanSelection } from "@/features/plan-picker/use-plan-selection";
import { ShoppingRegions } from "@/features/shopping-list";
import { SweepButton } from "@/features/shopping-list/sweep-button";
import { useShoppingList } from "@/features/shopping-list/use-shopping-list";
import { useStoreMoves } from "@/features/shopping-list/use-store-moves";
import { canChangePlan, orderPlans } from "@/lib/plans";
import { PREF_SHOPPING_PLANS } from "@/lib/preferences";
import { ShoppingDocument } from "@/screens/__generated__/shopping.generated";
import { useSuspenseQuery } from "@apollo/client/react";
import { useMemo } from "react";

export function Shopping() {
  // No boundary above: private routes lack loading.tsx (loading-and-errors.md).
  const { data } = useSuspenseQuery(ShoppingDocument);

  const plans = data.planner.plans;
  const [planIds, setPlanIds] = usePlanSelection(
    PREF_SHOPPING_PLANS,
    plans,
    "multiple",
  );
  useWatchPlans(planIds);
  const shownPlans = useMemo(
    () => orderPlans(plans).filter((plan) => planIds.includes(plan.id)),
    [plans, planIds],
  );
  // Only the shopped plans, so indicators show when several are shopped.
  const directory = useMemo(() => buildPlanDirectory(shownPlans), [shownPlans]);
  const shoppingPlans = useMemo(
    () =>
      shownPlans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        color: plan.color,
        changeable: canChangePlan(plan),
        rootIds: plan.children.map((it) => it.id),
        items: plan.descendants,
        buckets: plan.buckets,
      })),
    [shownPlans],
  );
  const { list, sweep } = useShoppingList(shoppingPlans);
  const storeMoves = useStoreMoves(list);

  const tree = useMemo(
    () =>
      buildPlanTree(shownPlans.flatMap((plan) => [plan, ...plan.descendants])),
    [shownPlans],
  );

  return (
    <PlanDirectoryProvider directory={directory}>
      <SectionHeader title="Shopping">
        <div className="flex items-center gap-sm">
          <SweepButton onSweep={sweep} />
          <PlanPicker
            label="Plans"
            plans={plans}
            selectionMode="multiple"
            selectedIds={planIds}
            onChange={setPlanIds}
          />
        </div>
      </SectionHeader>
      <div className="p-md bg-surface">
        <ShoppingRegions
          list={list}
          tree={tree}
          onAcquiredToggle={sweep}
          storeMoves={storeMoves}
        />
      </div>
    </PlanDirectoryProvider>
  );
}
