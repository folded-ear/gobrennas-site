import type { ReactNode } from "react";
import { BucketSection, UnplannedSection } from "./bucket-section";
import { PlanContext } from "./context";
import { DaySection } from "./day-section";
import { GapRow } from "./gap-row";
import { TimelineEntry, type TimelineSection } from "./model";
import { TimelineDnd } from "./timeline-row";

type DayListProps = {
  entries: readonly TimelineEntry[];
  today: string;
  context: PlanContext;
  /** The item open in its screen, marked wherever it shows. */
  openId?: string;
  onSelect?: (id: string) => void;
  /** Opens a section by its key. Left out, no section opens. */
  onOpenSection?: (key: string) => void;
  renderHeaderActions?: (section: TimelineSection) => ReactNode;
  renderFooter?: (section: TimelineSection) => ReactNode;
  dnd?: TimelineDnd;
};

/** I run the calendar down the page: labelled days, breaks between. */
export function DayList({
  entries,
  today,
  context,
  openId,
  onSelect,
  onOpenSection,
  renderHeaderActions,
  renderFooter,
  dnd,
}: DayListProps) {
  function renderEntry(entry: TimelineEntry) {
    switch (entry.kind) {
      case "day":
        return (
          <DaySection
            key={entry.date}
            day={entry}
            isToday={entry.date === today}
            context={context}
            openId={openId}
            onSelect={onSelect}
            onOpenSection={onOpenSection}
            headerActions={renderHeaderActions?.(entry)}
            footer={renderFooter?.(entry)}
            dnd={dnd}
          />
        );
      case "bucket":
        return (
          <BucketSection
            key={entry.key}
            bucket={entry}
            context={context}
            openId={openId}
            onSelect={onSelect}
            onOpenSection={onOpenSection}
            headerActions={renderHeaderActions?.(entry)}
            footer={renderFooter?.(entry)}
            dnd={dnd}
          />
        );
      case "unplanned":
        return (
          <UnplannedSection
            key="unplanned"
            unplanned={entry}
            context={context}
            openId={openId}
            onSelect={onSelect}
            onOpenSection={onOpenSection}
            headerActions={renderHeaderActions?.(entry)}
            footer={renderFooter?.(entry)}
            dnd={dnd}
          />
        );
      case "gap":
        return <GapRow key={`gap:${entry.after}`} gap={entry} />;
    }
  }

  const groups: {
    key: string;
    day: string | null;
    entries: TimelineEntry[];
  }[] = [];
  for (const entry of entries) {
    const previous = groups.at(-1);
    if (
      entry.kind === "bucket" &&
      entry.date !== null &&
      previous?.day === entry.date
    ) {
      previous.entries.push(entry);
    } else {
      groups.push({
        key:
          entry.kind === "day"
            ? entry.date
            : entry.kind === "bucket"
              ? entry.key
              : entry.kind === "gap"
                ? `gap:${entry.after}`
                : "unplanned",
        day: entry.kind === "day" ? entry.date : null,
        entries: [entry],
      });
    }
  }

  return (
    <ol className="flex flex-col gap-sm">
      {groups.map((group) =>
        group.day ? (
          <li
            role="presentation"
            key={group.key}
            className="rounded-sm border border-separator/70 px-sm"
          >
            <ol role="presentation" className="flex flex-col">
              {group.entries.map(renderEntry)}
            </ol>
          </li>
        ) : (
          renderEntry(group.entries[0])
        ),
      )}
    </ol>
  );
}
