import { AccessLevel } from "@/__generated__/graphql";
import type { PlanPickerPlanFragment } from "@/features/plan-picker/__generated__/planPickerPlan.generated";
import type { PlanAccess } from "@/lib/plans";

export type Bucket = {
  readonly id: string;
  readonly name: string | null;
  readonly date: string | null;
};
export type BucketPlan = PlanPickerPlanFragment &
  PlanAccess & { readonly buckets: readonly Bucket[] };
export type BucketAction =
  | { kind: "create"; date: string | null }
  | { kind: "edit" | "remove"; planId: string; bucket: Bucket };

export function canManageBuckets(plan: PlanAccess): boolean {
  return (
    plan.mine ||
    plan.grants.some(
      (grant) => grant.user.me && grant.level === AccessLevel.ADMINISTER,
    )
  );
}
