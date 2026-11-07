"use client";

import { PlanItemStatus } from "@/__generated__/graphql";
import { RecipeScale } from "@/components/recipe-scale";
import { CookPlanFragmentDoc } from "@/features/cook-recipe/__generated__/cookPlan.generated";
import { CookLoading } from "@/features/cook-recipe/loading";
import {
  buildCookRecipe,
  cookItemsOf,
  scaleCookItems,
} from "@/features/cook-recipe/model";
import { PreppedButton } from "@/features/cook-recipe/prepped-button";
import { CookRecipeTitle } from "@/features/cook-recipe/title";
import { CookedItButton } from "@/features/plan-status";
import { canChangePlan } from "@/lib/plans";
import { CookDocument } from "@/screens/__generated__/cook.generated";
import { useFragment, useSuspenseQuery } from "@apollo/client/react";
import { toast } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CookShell, CookUnavailable } from "./cook-shell";

type CookProps = { planId: string; itemId: string };

export function Cook(props: CookProps) {
  return <CookOccurrence key={`${props.planId}:${props.itemId}`} {...props} />;
}

function CookOccurrence({ planId, itemId }: CookProps) {
  const [factor, setFactor] = useState(1);
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
  const items = cookItemsOf(plan);
  const original = items.find((item) => item.id === itemId);
  const savedScale =
    original?.aggregate === null && original.quantity?.units === null
      ? original.quantity.quantity
      : 1;
  const unscaledRecipe = buildCookRecipe(items, itemId);
  const recipe = buildCookRecipe(scaleCookItems(items, itemId, factor), itemId);
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
      title={
        <CookRecipeTitle
          recipe={unscaledRecipe ?? recipe}
          planName={plan.name}
          displayScale={factor}
        />
      }
      actions={
        <>
          <div className="flex flex-col gap-xs">
            <RecipeScale
              key={itemId}
              value={savedScale * factor}
              onChange={(scale) => {
                try {
                  const factor = scale / savedScale;
                  scaleCookItems(items, itemId, factor);
                  setFactor(factor);
                } catch {
                  toast.danger("Couldn’t display that scale", {
                    description: "Choose a smaller positive multiplier.",
                  });
                }
              }}
            />
            <p className="text-sm text-muted">
              Display only — your plan and shopping list are unchanged.
            </p>
          </div>
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
