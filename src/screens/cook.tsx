"use client";

import { PlanItemStatus } from "@/__generated__/graphql";
import { CookRecipe } from "@/features/cook-recipe";
import { CookPlanFragmentDoc } from "@/features/cook-recipe/__generated__/cookPlan.generated";
import { CookLoading } from "@/features/cook-recipe/loading";
import { buildCookRecipe } from "@/features/cook-recipe/model";
import { PreppedButton } from "@/features/cook-recipe/prepped-button";
import { CookRecipeTitle } from "@/features/cook-recipe/title";
import { CookedItButton } from "@/features/plan-status";
import { RecipeActionBar } from "@/features/recipe-detail/action-bar";
import { canChangePlan } from "@/lib/plans";
import { PLANNER_PATH } from "@/lib/routes";
import { CookDocument } from "@/screens/__generated__/cook.generated";
import { useFragment, useSuspenseQuery } from "@apollo/client/react";
import { Button } from "@heroui/react";
import { useRouter } from "next/navigation";

type CookProps = { planId: string; itemId: string };

export function Cook({ planId, itemId }: CookProps) {
  const router = useRouter();
  const { data } = useSuspenseQuery(CookDocument, {
    variables: { planId },
    fetchPolicy: "network-only",
  });
  const { data: plan, complete } = useFragment({
    fragment: CookPlanFragmentDoc,
    fragmentName: "cookPlan",
    from: data.planner.plan,
  });
  if (!complete) return <CookLoading />;
  const items = plan.updatedSince
    .filter((item) => item.__typename === "PlanItem")
    .filter((item) => item.plan.id === planId);
  const recipe = buildCookRecipe(items, itemId);
  if (!recipe)
    return (
      <div className="p-xl">
        <h1>Recipe unavailable</h1>
        <p className="my-md">This recipe is no longer in this plan.</p>
        <Button onPress={() => router.replace(PLANNER_PATH)}>
          Back to planner
        </Button>
      </div>
    );
  const canChange = canChangePlan(plan);

  return (
    <div className="mx-auto flex h-[calc(100dvh-3.5rem-env(safe-area-inset-bottom))] w-full max-w-5xl flex-col px-md">
      <RecipeActionBar
        title={<CookRecipeTitle recipe={recipe} planName={plan.name} />}
        onClose={() => router.back()}
      >
        <PreppedButton itemId={itemId} planId={planId} canChange={canChange} />
        {canChange && recipe.main.item.status !== PlanItemStatus.COMPLETED ? (
          <CookedItButton
            itemId={itemId}
            planId={planId}
            onCooked={() => router.back()}
          />
        ) : null}
      </RecipeActionBar>
      <article
        aria-label={recipe.main.title}
        className="min-h-0 flex-1 overflow-y-auto py-md"
      >
        <CookRecipe recipe={recipe} />
      </article>
    </div>
  );
}
