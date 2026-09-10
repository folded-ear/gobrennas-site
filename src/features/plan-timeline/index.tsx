import { DaySection } from "./day-section";
import { GapRow } from "./gap-row";
import { TimelineEntry } from "./model";

type PlanTimelineProps = {
  entries: readonly TimelineEntry[];
  today: string;
  onSelect?: (id: string) => void;
};

/** I lay a plan out down the calendar, anchored at today. */
export function PlanTimeline({ entries, today, onSelect }: PlanTimelineProps) {
  return (
    <ol className="flex flex-col">
      {entries.map((entry) =>
        entry.kind === "day" ? (
          <DaySection
            key={entry.date}
            day={entry}
            isToday={entry.date === today}
            onSelect={onSelect}
          />
        ) : (
          <GapRow key={`gap:${entry.after}`} gap={entry} />
        ),
      )}
    </ol>
  );
}
