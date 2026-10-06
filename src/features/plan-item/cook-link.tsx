import { PlanItemStatus } from "@/__generated__/graphql";
import { CookIcon } from "@/components/icons";
import { useBucketPlans } from "@/features/plan-directory";
import {
  CancelPendingButton,
  LINE_CONTROL_CLASS_NAME,
  useItemStatus,
} from "@/features/plan-status";
import {
  TimelineBucketSection,
  TimelineDay,
} from "@/features/plan-timeline/model";
import { sectionLabel } from "@/features/plan-timeline/section-label";
import { displayName } from "@/lib/plan-item-name";
import clsx from "clsx";
import Link from "next/link";

type CookLinkProps = {
  planId: string;
  itemId: string;
  /** The item's name, so the link says what it cooks. */
  name: string;
};

/** I give the path to one plan item's cook view. */
export function cookHref(planId: string, itemId: string) {
  return `/plan/${planId}/recipe/${itemId}`;
}

const BUCKET_COOK_PATH = "/planner/cook";
const BUCKET_DATE_MARK = "@";
const ID_SEPARATOR = ",";
/** The label for a bucket whose name leaves nothing to slug. */
const FALLBACK_BUCKET_SLUG = "bucket";

/** I give a bucket's name as plain lowercase words joined by dashes. */
function slugOf(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/\p{Mark}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug === "" ? FALLBACK_BUCKET_SLUG : slug;
}

/** I give the words labelling a bucket's path: its name, date, or both. */
function bucketLabelOf(name: string | null, date: string | null): string {
  if (name === null) return date ?? FALLBACK_BUCKET_SLUG;
  return date === null
    ? slugOf(name)
    : `${slugOf(name)}${BUCKET_DATE_MARK}${date}`;
}

/**
 * I give the path to cooking some buckets as one meal. Their name and date
 * only label the path; the plans and buckets identify what's cooked.
 */
export function bucketCookHref(
  name: string | null,
  date: string | null,
  planIds: readonly string[],
  bucketIds: readonly string[],
) {
  const label = bucketLabelOf(name, date);
  return [
    BUCKET_COOK_PATH,
    label,
    planIds.join(ID_SEPARATOR),
    bucketIds.join(ID_SEPARATOR),
  ].join("/");
}

type CookIconLinkProps = {
  href: string;
  /** What the link cooks, so it can say so. */
  label: string;
};

/** I link to a cook view, boxed like the buttons beside me. */
function CookIconLink({ href, label }: CookIconLinkProps) {
  return (
    <Link
      href={href}
      className={clsx(
        "flex items-center justify-center rounded-sm text-primary hover:bg-default",
        LINE_CONTROL_CLASS_NAME,
      )}
    >
      <CookIcon size="small" aria-hidden="true" />
      <span className="sr-only">Cook {label}</span>
    </Link>
  );
}

/**
 * I link to a plan item's cook view, boxed like the buttons beside me. Once
 * the item has been cooked, I offer to undo that instead.
 */
export function CookLink({ planId, itemId, name }: CookLinkProps) {
  const item = useItemStatus(itemId);
  if (item?.pendingStatus === PlanItemStatus.COMPLETED) {
    return (
      <CancelPendingButton itemId={itemId} status={PlanItemStatus.COMPLETED} />
    );
  }
  return (
    <CookIconLink href={cookHref(planId, itemId)} label={displayName(name)} />
  );
}

type BucketCookLinkProps = {
  section: TimelineBucketSection | TimelineDay;
};

/**
 * I link to cooking everything in a day or bucket section, across every
 * plan it spans, as one meal. A section holding nothing has nothing to cook,
 * and one whose plans I can't find has nowhere to cook it.
 */
export function BucketCookLink({ section }: BucketCookLinkProps) {
  const plans = useBucketPlans(section.bucketIds);
  if (section.roots.length === 0 || plans.length === 0) return null;
  return (
    <CookIconLink
      href={bucketCookHref(
        section.kind === "bucket" ? section.name : null,
        section.date,
        plans.map((plan) => plan.id),
        section.bucketIds,
      )}
      label={sectionLabel(section)}
    />
  );
}
