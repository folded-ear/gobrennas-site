import { PlanContext } from "./context";
import { DaySection } from "./day-section";
import { GapRow } from "./gap-row";
import { TimelineEntry } from "./model";
import { TimelineDnd } from "./timeline-row";

type DayListProps = {
  entries: readonly TimelineEntry[];
  today: string;
  context: PlanContext;
  /** The item open in its screen, marked wherever it shows. */
  openId?: string;
  onSelect?: (id: string) => void;
  dnd?: TimelineDnd;
  /** Left out, no item offers to be cooked. */
  planId?: string;
};

/** I run the calendar down the page: labelled days, breaks between. */
export function DayList({
  entries,
  today,
  context,
  openId,
  onSelect,
  dnd,
  planId,
}: DayListProps) {
  return (
    <ol className="flex flex-col">
      {entries.map((entry) =>
        entry.kind === "day" ? (
          <DaySection
            key={entry.date}
            day={entry}
            isToday={entry.date === today}
            context={context}
            openId={openId}
            onSelect={onSelect}
            dnd={dnd}
            planId={planId}
          />
        ) : (
          <GapRow key={`gap:${entry.after}`} gap={entry} />
        ),
      )}
    </ol>
  );
}
