"use client";

import { PlanItemStatus } from "@/__generated__/graphql";
import { CookPlanFragmentDoc } from "@/features/cook-recipe/__generated__/cookPlan.generated";
import { CookLoading } from "@/features/cook-recipe/loading";
import { buildCookRecipe, cookItemsOf } from "@/features/cook-recipe/model";
import { PreppedButton } from "@/features/cook-recipe/prepped-button";
import { CookRecipeTitle } from "@/features/cook-recipe/title";
import { CookedItButton } from "@/features/plan-status";
import { canChangePlan } from "@/lib/plans";
import { CookDocument } from "@/screens/__generated__/cook.generated";
import { useFragment, useSuspenseQuery } from "@apollo/client/react";
import { useRouter } from "next/navigation";
import { CookShell, CookUnavailable } from "./cook-shell";

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
  const recipe = buildCookRecipe(cookItemsOf(plan), itemId);
  if (!recipe)
    return (
      <CookUnavailable
        heading="Recipe unavailable"
        message="This recipe is no longer in this plan."
      />
    );
  const canChange = canChangePlan(plan);

  return (
    <CookShell
      title={<CookRecipeTitle recipe={recipe} planName={plan.name} />}
      actions={
        <>
          <PreppedButton
            itemId={itemId}
            planId={planId}
            canChange={canChange}
          />
          {canChange && recipe.main.item.status !== PlanItemStatus.COMPLETED ? (
            <CookedItButton
              itemId={itemId}
              planId={planId}
              onCooked={() => router.back()}
            />
          ) : null}
        </>
      }
      recipe={recipe}
    />
  );
}
