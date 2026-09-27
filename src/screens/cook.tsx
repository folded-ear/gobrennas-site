"use client";

import { canChangePlan } from "@/features/plan-dnd/moves";
import { CookedItButton, StatusButton } from "@/features/plan-status";
import { CookDocument } from "@/screens/__generated__/cook.generated";
import { useSuspenseQuery } from "@apollo/client/react";
import { useRouter } from "next/navigation";

type CookProps = {
  planId: string;
  itemId: string;
};

export function Cook({ planId, itemId }: CookProps) {
  const router = useRouter();
  // No boundary above: private routes lack loading.tsx (loading-and-errors.md).
  const { data } = useSuspenseQuery(CookDocument, {
    variables: { planId, itemId },
  });
  const canChange = canChangePlan(data.planner.plan);

  return (
    <div className="flex flex-col gap-sm p-md">
      <h1>Cook view</h1>
      <div className="flex items-center gap-sm">
        <StatusButton itemId={itemId} planId={planId} canChange={canChange} />
        {canChange ? (
          <CookedItButton
            itemId={itemId}
            planId={planId}
            // Its undo waits on the plan, where going back lands.
            onCooked={() => router.back()}
          />
        ) : null}
      </div>
      <p className="text-muted">
        Plan {planId}, item {itemId}. Nothing to cook here yet.
      </p>
    </div>
  );
}
