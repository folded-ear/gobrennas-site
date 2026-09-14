import { formatDayLabel } from "./dates";
import { TimelineSection } from "./model";

const UNPLANNED_LABEL = "Unplanned";

/** I give the words a section is headed by, on the timeline or its screen. */
export function sectionLabel(section: TimelineSection): string {
  switch (section.kind) {
    case "day":
      return formatDayLabel(section.date);
    case "bucket":
      return section.date !== null
        ? `${section.name} – ${formatDayLabel(section.date)}`
        : section.name;
    case "unplanned":
      return UNPLANNED_LABEL;
  }
}
