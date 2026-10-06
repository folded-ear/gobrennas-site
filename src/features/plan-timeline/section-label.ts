import { bucketLabel } from "@/lib/buckets";
import { TimelineSection } from "./model";

/** I give the words a section is headed by, on the timeline or its screen. */
export function sectionLabel(section: TimelineSection): string {
  switch (section.kind) {
    case "day":
      return bucketLabel(null, section.date);
    case "bucket":
      return bucketLabel(section.name, section.date);
    case "unplanned":
      return bucketLabel(null, null);
  }
}
