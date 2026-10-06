import { PlanDotStack } from "@/components/plan-dot";
import {
  useBucketPlans,
  useShowsPlanIndicators,
} from "@/features/plan-directory";
import { BucketCookLink } from "@/features/plan-timeline/bucket-cook-link";
import { TimelineSection } from "@/features/plan-timeline/model";
import { sectionLabel } from "@/features/plan-timeline/section-label";

const NO_BUCKETS: readonly string[] = [];

type PlanSectionHeaderProps = {
  section: TimelineSection;
};

/**
 * I head an open section's screen: its label, as the timeline gives it,
 * and a rule before whatever sits in it.
 */
export function PlanSectionHeader({ section }: PlanSectionHeaderProps) {
  const plans = useBucketPlans(
    section.kind === "unplanned" ? NO_BUCKETS : section.bucketIds,
  );
  const showsPlans = useShowsPlanIndicators();

  return (
    <div className="flex flex-col gap-sm pb-sm">
      <div className="flex items-center gap-xs">
        <h2 className="min-w-0 text-xl font-semibold text-foreground">
          {sectionLabel(section)}
          {showsPlans && section.kind === "bucket" && plans.length > 0 ? (
            <span className="ms-xs">
              <PlanDotStack plans={plans} />
            </span>
          ) : null}
        </h2>
        {section.kind === "unplanned" ? null : (
          <BucketCookLink
            section={section}
            planIds={plans.map((plan) => plan.id)}
          />
        )}
      </div>
      {section.roots.length > 0 ? (
        // Where the section's own heading stops and its contents start.
        <hr className="border-separator" />
      ) : null}
    </div>
  );
}
