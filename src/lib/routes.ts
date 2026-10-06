export const PLANNER_PATH = "/planner";

const BUCKET_COOK_PATH = `${PLANNER_PATH}/cook`;
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
function bucketSlugOf(name: string | null, date: string | null): string {
  if (name === null) return date ?? FALLBACK_BUCKET_SLUG;
  return date === null
    ? slugOf(name)
    : `${slugOf(name)}${BUCKET_DATE_MARK}${date}`;
}

/**
 * I give the path to cooking some buckets as one. Their name and date
 * only label the path; the plans and buckets identify what's cooked.
 */
export function bucketCookHref(
  name: string | null,
  date: string | null,
  planIds: readonly string[],
  bucketIds: readonly string[],
) {
  return [
    BUCKET_COOK_PATH,
    bucketSlugOf(name, date),
    planIds.join(ID_SEPARATOR),
    bucketIds.join(ID_SEPARATOR),
  ].join("/");
}

/** I give the ids listed in one of a bucket cook path's segments. */
export function parseBucketCookIds(segment: string): readonly string[] {
  return decodeURIComponent(segment).split(ID_SEPARATOR);
}
