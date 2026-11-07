import { FragmentType } from "@apollo/client";
import { useFragment } from "@apollo/client/react";
import { useId } from "react";
import {
  PlanGrantsFragment,
  PlanGrantsFragmentDoc,
} from "./__generated__/management.generated";
import { GrantAdd } from "./grant-add";
import { GrantList } from "./grant-list";

/**
 * I show who a plan is shared with. Administrators can share it with more
 * friends, change anyone's access, and remove it.
 */
export function PlanGrants({
  plan: reference,
  canAdminister,
  isDisabled,
  onLeave,
}: {
  plan: FragmentType<PlanGrantsFragment>;
  canAdminister: boolean;
  isDisabled: boolean;
  /** Called once the viewer has changed their own access. */
  onLeave: () => void;
}) {
  const headingId = useId();
  const { data: plan, complete } = useFragment({
    fragment: PlanGrantsFragmentDoc,
    fragmentName: "planGrants",
    from: reference,
  });
  if (!complete) return null;
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-md border-t border-separator pt-lg"
    >
      <h3 id={headingId} className="text-sm font-medium">
        Sharing
      </h3>
      <GrantList
        planId={plan.id}
        owner={plan.owner}
        grants={plan.grants}
        canAdminister={canAdminister}
        isDisabled={isDisabled}
        onLeave={onLeave}
      />
      {canAdminister ? (
        <GrantAdd
          planId={plan.id}
          excludedIds={[
            plan.owner.id,
            ...plan.grants.map((grant) => grant.user.id),
          ]}
          isDisabled={isDisabled}
        />
      ) : null}
    </section>
  );
}
