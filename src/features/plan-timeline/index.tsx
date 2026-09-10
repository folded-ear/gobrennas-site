"use client";

import { useMemo } from "react";
import { DayList } from "./day-list";
import { buildTimeline, TimelineBucket, TimelineItem } from "./model";
import { useToday } from "./use-today";

type PlanTimelineProps = {
  /** The plan's own children, in display order. */
  rootIds: readonly string[];
  items: readonly TimelineItem[];
  buckets: readonly TimelineBucket[];
  onSelect?: (id: string) => void;
};

/** I lay a plan out down the calendar, anchored at the viewer's today. */
export function PlanTimeline({
  rootIds,
  items,
  buckets,
  onSelect,
}: PlanTimelineProps) {
  const today = useToday();
  const entries = useMemo(
    () => buildTimeline({ rootIds, items, buckets, today }),
    [rootIds, items, buckets, today],
  );

  return <DayList entries={entries} today={today} onSelect={onSelect} />;
}
