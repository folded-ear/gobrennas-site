"use client";

import { RecipeScale } from "@/components/recipe-scale";
import { usePageEngine } from "@/features/page-engine";
import { useItemPlan } from "@/features/plan-directory";
import { useFragment, useMutation } from "@apollo/client/react";
import { toast } from "@heroui/react";
import { useRef, useState } from "react";
import { PlanItemFragmentDoc } from "./__generated__/planItem.generated";
import { ScaleAvailabilityFragmentDoc } from "./__generated__/scaleAvailability.generated";
import { ScaleRecipeDocument } from "./__generated__/scaleRecipe.generated";

export function PlanRecipeScale({ itemId }: { itemId: string }) {
  const [mutate] = useMutation(ScaleRecipeDocument);
  const engine = usePageEngine();
  const plan = useItemPlan(itemId);
  const [loading, setLoading] = useState(false);
  const pending = useRef(false);
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
          if (next === scale || pending.current) return;
          pending.current = true;
          void (async () => {
            setLoading(true);
            try {
              if (!Number.isFinite(next) || next <= 0)
                throw new Error("Invalid recipe scale.");
              // Do not race a queued ingredient edit with server-side scaling.
              if (await engine.unsent()) {
                toast.danger("Plan changes are still saving", {
                  description:
                    "Wait for them to finish, then scale the recipe.",
                });
                return;
              }
              const result = await mutate({
                variables: { id: itemId, scale: next },
              });
              if (!result.data?.planner.scaleRecipe.id)
                throw new Error("No plan item returned.");
            } catch {
              toast.danger("Couldn’t scale recipe", {
                description: "Please try again.",
              });
            } finally {
              pending.current = false;
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
