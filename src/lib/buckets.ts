import { formatDayLabel } from "./dates";

const UNPLANNED_LABEL = "Unplanned";

/** I say whether a bucket is named: its name has more than whitespace. */
export function isNamedBucket<B extends { readonly name: string | null }>(
  bucket: B,
): bucket is B & { readonly name: string } {
  return bucket.name !== null && bucket.name.trim() !== "";
}

/**
 * I give the words a bucket is headed by: its name and date, whichever it
 * has. A bucket with neither puts its items in Unplanned.
 */
export function bucketLabel(name: string | null, date: string | null): string {
  if (name === null) {
    return date === null ? UNPLANNED_LABEL : formatDayLabel(date);
  }
  return date === null ? name : `${name} – ${formatDayLabel(date)}`;
}
