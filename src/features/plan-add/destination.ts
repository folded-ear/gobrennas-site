import { AccessLevel } from "@/__generated__/graphql";
import { bucketForName, isNamedBucket } from "@/features/plan-dnd/moves";
import type { PlanPickerPlanFragment } from "@/features/plan-picker/__generated__/planPickerPlan.generated";
import type {
  TimelineBucket,
  TimelineSection,
} from "@/features/plan-timeline/model";
import { canChangePlan, type PlanAccess } from "@/lib/plans";

export type AddPlan = PlanPickerPlanFragment &
  PlanAccess & {
    readonly buckets: readonly TimelineBucket[];
    readonly children: readonly { readonly id: string }[];
  };

/** Only an unnamed bucket belongs directly to a day on the timeline. */
export function destinationBucket(
  plan: AddPlan,
  section: TimelineSection,
): string | undefined {
  if (section.kind === "unplanned") return undefined;
  if (section.kind === "bucket")
    return bucketForName(plan.buckets, section.name, section.date) ?? undefined;
  return plan.buckets.find(
    (bucket) => bucket.date === section.date && !isNamedBucket(bucket),
  )?.id;
}

export function canAddToSection(
  plan: AddPlan,
  section: TimelineSection,
): boolean {
  if (!canChangePlan(plan)) return false;
  if (section.kind === "unplanned" || destinationBucket(plan, section))
    return true;
  // Making the destination bucket requires admin access, even when adding items does not.
  return (
    plan.mine ||
    plan.grants.some(
      (grant) => grant.user.me && grant.level === AccessLevel.ADMINISTER,
    )
  );
}
