"use client";

import { PlanItemStatus } from "@/__generated__/graphql";
import { CookRecipe } from "@/features/cook-recipe";
import { CookPlanFragmentDoc } from "@/features/cook-recipe/__generated__/cookPlan.generated";
import {
  buildCookBuckets,
  CookBucketsPlan,
} from "@/features/cook-recipe/buckets";
import { CookLoading } from "@/features/cook-recipe/loading";
import { CookSection } from "@/features/cook-recipe/model";
import { PreppedButton } from "@/features/cook-recipe/prepped-button";
import { CookedItButton } from "@/features/plan-status";
import { RecipeActionBar } from "@/features/recipe-detail/action-bar";
import { canChangePlan } from "@/lib/plans";
import { PLANNER_PATH } from "@/lib/routes";
import { CookBucketDocument } from "@/screens/__generated__/cook-bucket.generated";
import { useFragment, useSuspenseQuery } from "@apollo/client/react";
import { Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

type CookBucketProps = {
  planIds: readonly string[];
  bucketIds: readonly string[];
};

export function CookBucket({ planIds, bucketIds }: CookBucketProps) {
  return (
    <>
      {planIds.map((planId) => (
        <LoadPlan key={planId} planId={planId} />
      ))}
      <CookBucketsView planIds={planIds} bucketIds={bucketIds} />
    </>
  );
}

// Suspends until its plan is in the cache, where the buckets are read from it.
function LoadPlan({ planId }: { planId: string }) {
  useSuspenseQuery(CookBucketDocument, {
    variables: { planId },
    fetchPolicy: "network-only",
  });
  return null;
}

function CookBucketsView({ planIds, bucketIds }: CookBucketProps) {
  const router = useRouter();
  const from = useMemo(
    () => planIds.map((id) => ({ __typename: "Plan", id })),
    [planIds],
  );
  const { data: plans, complete } = useFragment({
    fragment: CookPlanFragmentDoc,
    fragmentName: "cookPlan",
    from,
  });
  if (!complete) return <CookLoading />;
  const bucketsPlans: CookBucketsPlan[] = plans.map((plan) => ({
    childIds: plan.children.map((child) => child.id),
    items: plan.updatedSince
      .filter((item) => item.__typename === "PlanItem")
      .filter((item) => item.plan.id === plan.id),
    buckets: plan.buckets,
  }));
  const cooked = buildCookBuckets(bucketsPlans, bucketIds);
  if (!cooked)
    return (
      <div className="p-xl">
        <h1>Nothing to cook</h1>
        <p className="my-md">These buckets no longer hold anything.</p>
        <Button onPress={() => router.replace(PLANNER_PATH)}>
          Back to planner
        </Button>
      </div>
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
    <div className="mx-auto flex h-[calc(100dvh-3.5rem-env(safe-area-inset-bottom))] w-full max-w-5xl flex-col px-md">
      <RecipeActionBar
        title={<h1 className="break-words">{cooked.label}</h1>}
        onClose={() => router.back()}
      />
      <article
        aria-label={cooked.label}
        className="min-h-0 flex-1 overflow-y-auto py-md"
      >
        <CookRecipe recipe={cooked.recipe} sectionActions={rootActions} />
      </article>
    </div>
  );
}
