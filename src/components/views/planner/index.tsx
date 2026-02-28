"use client";

import { OtherUserAvatar } from "@/components/ui/user-avatar";
import { usePreference } from "@/hooks/use-preference";
import { useSetPreference } from "@/hooks/use-set-preference";
import { PREF_ACTIVE_PLAN } from "@/lib/preferences";
import { useSuspenseQuery } from "@apollo/client/react";
import { Button, Separator } from "@heroui/react";
import { GetPlanListDocument } from "./__generated__/getPlanList.generated";

export function PlanList() {
  const { data } = useSuspenseQuery(GetPlanListDocument, {});
  const activePlanId = usePreference(PREF_ACTIVE_PLAN);
  const [setActivePlan] = useSetPreference(PREF_ACTIVE_PLAN);

  const active = data.planner.plans.find((p) => p.id === activePlanId);
  return (
    <>
      <pre className="text-wrap">activePlanId: {activePlanId}</pre>
      <ul>
        {data.planner.plans.map((p) => (
          <li key={p.id} className="flex flex-row gap-2">
            {p.id === activePlanId ? (
              <Button isIconOnly isDisabled>
                &mdash;
              </Button>
            ) : (
              <Button
                isIconOnly
                variant={"secondary"}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setActivePlan(p.id);
                }}
              >
                O
              </Button>
            )}
            <span>{p.name}</span>

            <OtherUserAvatar user={p.ownedBy} />
          </li>
        ))}
      </ul>
      <Separator />
      <pre className="text-wrap">active: {JSON.stringify(active, null, 2)}</pre>
      <pre className="text-wrap">data: {JSON.stringify(data, null, 2)}</pre>
    </>
  );
}
