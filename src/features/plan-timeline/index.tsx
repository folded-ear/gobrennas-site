"use client";

import { PlanDnd } from "@/features/plan-dnd";
import { DragSession } from "@/features/plan-dnd/drag-session";
import { useMemo } from "react";
import { DayList } from "./day-list";
import {
  buildTimeline,
  dayOfItems,
  TimelineBucket,
  TimelineItem,
} from "./model";
import { TimelineDnd } from "./timeline-row";
import { useToday } from "./use-today";

const TIMELINE_DRAG_TYPE = "application/x.gobrennas.timeline-item";

type PlanTimelineProps = {
  /** The plan's own children, in display order. */
  rootIds: readonly string[];
  items: readonly TimelineItem[];
  buckets: readonly TimelineBucket[];
  onSelect?: (id: string) => void;
  /** Left out, nothing can be dragged. */
  dnd?: PlanDnd;
};

/** I lay a plan out down the calendar, anchored at the viewer's today. */
export function PlanTimeline({
  rootIds,
  items,
  buckets,
  onSelect,
  dnd,
}: PlanTimelineProps) {
  const today = useToday();
  const entries = useMemo(
    () => buildTimeline({ rootIds, items, buckets, today }),
    [rootIds, items, buckets, today],
  );

  const dayOf = useMemo(() => dayOfItems(entries), [entries]);
  const rootIdSet = useMemo(() => new Set(rootIds), [rootIds]);

  if (!dnd) {
    return <DayList entries={entries} today={today} onSelect={onSelect} />;
  }
  const timelineDnd: TimelineDnd = { ...dnd, rootIds: rootIdSet, dayOf };
  return (
    <DragSession
      dragType={TIMELINE_DRAG_TYPE}
      canMove={dnd.canMove}
      isMoving={dnd.moves.isMoving}
    >
      <DayList
        entries={entries}
        today={today}
        onSelect={onSelect}
        dnd={timelineDnd}
      />
    </DragSession>
  );
}
