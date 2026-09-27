"use client";

import { SectionHeader } from "@/components/section-header";
import {
  buildPlanDirectory,
  PlanDirectoryProvider,
} from "@/features/plan-directory";
import { PlanPicker } from "@/features/plan-picker";
import { usePlanSelection } from "@/features/plan-picker/use-plan-selection";
import { ShoppingRegions } from "@/features/shopping-list";
import { buildShoppingList } from "@/features/shopping-list/model";
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
  const shownPlans = useMemo(
    () => orderPlans(plans).filter((plan) => planIds.includes(plan.id)),
    [plans, planIds],
  );
  // Only the shopped plans, so indicators show when several are shopped.
  const directory = useMemo(() => buildPlanDirectory(shownPlans), [shownPlans]);
  const list = useMemo(
    () =>
      buildShoppingList(
        shownPlans.map((plan) => ({
          id: plan.id,
          name: plan.name,
          color: plan.color,
          changeable: canChangePlan(plan),
          rootIds: plan.children.map((it) => it.id),
          items: plan.descendants,
          buckets: plan.buckets,
        })),
      ),
    [shownPlans],
  );

  return (
    <PlanDirectoryProvider directory={directory}>
      <SectionHeader title="Shopping">
        <PlanPicker
          label="Plans"
          plans={plans}
          selectionMode="multiple"
          selectedIds={planIds}
          onChange={setPlanIds}
        />
      </SectionHeader>
      <div className="p-md">
        <ShoppingRegions list={list} />
      </div>
    </PlanDirectoryProvider>
  );
}
