"use client";

import { PlanItemStatus } from "@/__generated__/graphql";
import { CookPlanFragmentDoc } from "@/features/cook-recipe/__generated__/cookPlan.generated";
import { buildCookBuckets } from "@/features/cook-recipe/buckets";
import { CookLoading } from "@/features/cook-recipe/loading";
import { cookItemsOf, CookSection } from "@/features/cook-recipe/model";
import { PreppedButton } from "@/features/cook-recipe/prepped-button";
import { CookedItButton } from "@/features/plan-status";
import { canChangePlan } from "@/lib/plans";
import { CookBucketDocument } from "@/screens/__generated__/cook-bucket.generated";
import { skipToken, useFragment, useSuspenseQuery } from "@apollo/client/react";
import { CookShell, CookUnavailable } from "./cook-shell";

const NO_PLANS: never[] = [];

type CookBucketProps = {
  planIds: readonly string[];
  bucketIds: readonly string[];
};

export function CookBucket({ planIds, bucketIds }: CookBucketProps) {
  const { data } = useSuspenseQuery(
    CookBucketDocument,
    planIds.length === 0
      ? skipToken
      : { variables: { planIds: [...planIds] }, fetchPolicy: "network-only" },
  );
  const { data: plans, complete } = useFragment({
    fragment: CookPlanFragmentDoc,
    fragmentName: "cookPlan",
    from: data?.planner.plans ?? NO_PLANS,
  });
  if (!complete) return <CookLoading />;
  const cooked = buildCookBuckets(
    plans.map((plan) => ({
      childIds: plan.children.map((child) => child.id),
      items: cookItemsOf(plan),
      buckets: plan.buckets,
    })),
    bucketIds,
  );
  if (!cooked)
    return (
      <CookUnavailable
        heading="Nothing to cook"
        message="These buckets no longer hold anything."
      />
    );
  const changeable = new Map(
    plans.map((plan) => [plan.id, canChangePlan(plan)]),
  );

  const rootActions = ({ item }: CookSection) => {
    if (!cooked.rootIds.has(item.id)) return null;
    const canChange = changeable.get(item.plan.id) ?? false;
    return (
      <>
        <PreppedButton
          itemId={item.id}
          planId={item.plan.id}
          canChange={canChange}
        />
        {canChange && item.status !== PlanItemStatus.COMPLETED ? (
          <CookedItButton itemId={item.id} planId={item.plan.id} />
        ) : null}
      </>
    );
  };

  return (
    <CookShell
      title={<h1 className="break-words">{cooked.label}</h1>}
      recipe={cooked.recipe}
      sectionActions={rootActions}
    />
  );
}
