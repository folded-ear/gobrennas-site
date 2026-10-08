"use client";

import { PlanDnd } from "@/features/plan-dnd";
import { DragSession } from "@/lib/dnd/drag-session";
import { useMemo, type ReactNode } from "react";
import { buildPlanContext } from "./context";
import { DayList } from "./day-list";
import {
  buildTimeline,
  sectionOfItems,
  TimelinePlan,
  type TimelineSection,
} from "./model";
import { TimelineDnd } from "./timeline-row";
import { useToday } from "./use-today";

const TIMELINE_DRAG_TYPE = "application/x.gobrennas.timeline-item";

type PlanTimelineProps = {
  /** In plan order. */
  plans: readonly TimelinePlan[];
  /** The item open in its screen, marked wherever it shows. */
  openId?: string;
  onSelect?: (id: string) => void;
  /** Opens a section by its key. Left out, no section opens. */
  onOpenSection?: (key: string) => void;
  renderFooter?: (section: TimelineSection) => ReactNode;
  /** Left out, nothing can be dragged. */
  dnd?: PlanDnd;
};

/** I lay plans out down one calendar, anchored at the viewer's today. */
export function PlanTimeline({
  plans,
  openId,
  onSelect,
  onOpenSection,
  renderFooter,
  dnd,
}: PlanTimelineProps) {
  const today = useToday();
  const entries = useMemo(
    () => buildTimeline({ plans, today }),
    [plans, today],
  );
  // I hold everything context needs already, so I ask for it myself
  // rather than making every caller keep one in step with my own props.
  const context = useMemo(() => buildPlanContext({ plans }), [plans]);

  const sectionOf = useMemo(() => sectionOfItems(entries), [entries]);
  const rootIdSet = useMemo(
    () => new Set(plans.flatMap((plan) => plan.rootIds)),
    [plans],
  );

  if (!dnd) {
    return (
      <DayList
        entries={entries}
        today={today}
        context={context}
        openId={openId}
        onSelect={onSelect}
        onOpenSection={onOpenSection}
        renderFooter={renderFooter}
      />
    );
  }
  const timelineDnd: TimelineDnd = { ...dnd, rootIds: rootIdSet, sectionOf };
  return (
    <DragSession dragType={TIMELINE_DRAG_TYPE} canMove={dnd.canMove}>
      <DayList
        entries={entries}
        today={today}
        context={context}
        openId={openId}
        onSelect={onSelect}
        onOpenSection={onOpenSection}
        renderFooter={renderFooter}
        dnd={timelineDnd}
      />
    </DragSession>
  );
}
