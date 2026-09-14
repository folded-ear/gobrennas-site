import { PlanDotStack } from "@/components/plan-dot";
import {
  useBucketPlans,
  useShowsPlanIndicators,
} from "@/features/plan-directory";
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
    section.kind === "bucket" ? section.bucketIds : NO_BUCKETS,
  );
  const showsPlans = useShowsPlanIndicators();

  return (
    <div className="flex flex-col gap-sm pb-sm">
      <h2 className="text-xl font-semibold text-foreground">
        {sectionLabel(section)}
        {showsPlans && plans.length > 0 ? (
          <span className="ms-xs">
            <PlanDotStack plans={plans} />
          </span>
        ) : null}
      </h2>
      {section.roots.length > 0 ? (
        // Where the section's own heading stops and its contents start.
        <hr className="border-separator" />
      ) : null}
    </div>
  );
}
