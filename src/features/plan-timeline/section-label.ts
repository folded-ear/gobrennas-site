import { formatDayLabel } from "./dates";
import { TimelineSection } from "./model";

const UNPLANNED_LABEL = "Unplanned";

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

/** I give the words a section is headed by, on the timeline or its screen. */
export function sectionLabel(section: TimelineSection): string {
  switch (section.kind) {
    case "day":
      return bucketLabel(null, section.date);
    case "bucket":
      return bucketLabel(section.name, section.date);
    case "unplanned":
      return UNPLANNED_LABEL;
  }
}
