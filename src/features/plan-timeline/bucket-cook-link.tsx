import { CookIconLink } from "@/components/cook-icon-link";
import { bucketCookHref } from "@/lib/routes";
import { TimelineBucketSection, TimelineDay } from "./model";
import { sectionLabel } from "./section-label";

type BucketCookLinkProps = {
  section: TimelineBucketSection | TimelineDay;
  /** The plans the section's buckets belong to, in plan order. */
  planIds: readonly string[];
};

/**
 * I link to cooking everything in a day or bucket section, across every
 * plan it spans, as one. A section holding nothing has nothing to cook,
 * and one without plans has nowhere to cook it.
 */
export function BucketCookLink({ section, planIds }: BucketCookLinkProps) {
  if (section.roots.length === 0 || planIds.length === 0) return null;
  return (
    <CookIconLink
      href={bucketCookHref(
        section.kind === "bucket" ? section.name : null,
        section.date,
        planIds,
        section.bucketIds,
      )}
      label={sectionLabel(section)}
    />
  );
}
