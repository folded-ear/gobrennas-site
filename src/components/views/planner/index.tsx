"use client";

import { OtherUserAvatar } from "@/components/ui/user-avatar";
import { UserPrefFragmentDoc } from "@/lib/__generated__/userPref.generated";
import {
  useFragment,
  useMutation,
  useSuspenseQuery,
} from "@apollo/client/react";
import { Button, Separator } from "@heroui/react";
import { GetPlanListDocument } from "./__generated__/getPlanList.generated";
import { SetActivePlanDocument } from "./__generated__/setActivePlan.generated";

export function PlanList() {
  const { data } = useSuspenseQuery(GetPlanListDocument, {});
  const { data: activePlan } = useFragment({
    fragment: UserPrefFragmentDoc,
    from: data.profile.me.activePlan,
  });
  const [setActivePlan] = useMutation(SetActivePlanDocument);

  const activePlanId = activePlan?.value;
  const active = data.planner.plans.find((p) => p.id === activePlanId);
  return (
    <>
      <pre className="text-wrap">{JSON.stringify(activePlan, null, 2)}</pre>
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
                  setActivePlan({ variables: { id: p.id } });
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
      <pre className="text-wrap">{JSON.stringify(active, null, 2)}</pre>
      <pre className="text-wrap">{JSON.stringify(data, null, 2)}</pre>
    </>
  );
}
