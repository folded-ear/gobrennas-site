"use client";

import { RecipeScale } from "@/components/recipe-scale";
import { usePageEngine } from "@/features/page-engine";
import { useItemPlan } from "@/features/plan-directory";
import { scaledIngredientName, scaledQuantities } from "@/lib/recipe-scaling";
import { useApolloClient, useFragment } from "@apollo/client/react";
import { toast } from "@heroui/react";
import { useState } from "react";
import { PlanItemFragmentDoc } from "./__generated__/planItem.generated";
import { ScaleAvailabilityFragmentDoc } from "./__generated__/scaleAvailability.generated";
import { ScalingPlanDocument } from "./__generated__/scalingPlan.generated";

export function PlanRecipeScale({ itemId }: { itemId: string }) {
  const client = useApolloClient();
  const engine = usePageEngine();
  const plan = useItemPlan(itemId);
  const [loading, setLoading] = useState(false);
  const { data: availability } = useFragment({
    fragment: ScaleAvailabilityFragmentDoc,
    from: { __typename: "PlanItem", id: itemId },
  });
  const { data, complete } = useFragment({
    fragment: PlanItemFragmentDoc,
    from: { __typename: "PlanItem", id: itemId },
  });
  if (
    !complete ||
    !plan?.changeable ||
    data.aggregate ||
    (data.quantity && data.quantity.units !== null) ||
    data.ingredient?.__typename !== "Recipe" ||
    data.status === "DELETED" ||
    data.status === "COMPLETED"
  )
    return null;
  const scale = data.quantity?.quantity ?? 1;
  return (
    <div className="flex flex-col gap-xs">
      <RecipeScale
        value={scale}
        isDisabled={
          loading || Boolean(availability.pendingStatus) || availability.inert
        }
        onChange={(next) => {
          if (next === scale) return;
          void (async () => {
            setLoading(true);
            try {
              const read = (id: string) =>
                client.cache.readFragment({
                  fragment: PlanItemFragmentDoc,
                  id: client.cache.identify({ __typename: "PlanItem", id }),
                });
              // Most items are already loaded. Linked completed preparation may not
              // be, so load the full cooking graph only when it is needed.
              try {
                scaledQuantities(itemId, 1, (id) => {
                  const item = read(id);
                  if (!item) throw new Error("Missing preparation");
                  return item;
                });
              } catch {
                await client.query({
                  query: ScalingPlanDocument,
                  variables: { planId: plan.id },
                  fetchPolicy: "network-only",
                });
              }
              const current = read(itemId);
              if (!current) throw new Error("Recipe unavailable");
              const factor = next / (current.quantity?.quantity ?? 1);
              const names: Record<string, string> = {};
              const quantities = scaledQuantities(itemId, factor, (id) => {
                const item = read(id);
                if (!item)
                  throw new Error("Recipe ingredients are not loaded.");
                if (
                  item.quantity &&
                  item.ingredient?.__typename !== "Recipe" &&
                  !item.name.startsWith("!")
                )
                  names[id] = scaledIngredientName(
                    item.name,
                    item.quantity.quantity * factor,
                  );
                return item;
              });
              quantities[itemId] = next;
              engine.set([
                {
                  kind: "scaleRecipe",
                  id: itemId,
                  planId: plan.id,
                  name: data.name,
                  scale: next,
                  quantities,
                  names,
                },
              ]);
            } catch {
              toast.danger("Couldn’t scale recipe", {
                description: "Your plan is unchanged. Please try again.",
              });
            } finally {
              setLoading(false);
            }
          })();
        }}
      />
      <p className="text-sm text-muted">
        Saved to this plan and used by the shopping list.
      </p>
    </div>
  );
}
