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
import { PlannerPanel } from "./planner-panel";
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
  renderHeaderActions?: (section: TimelineSection) => ReactNode;
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
  renderHeaderActions,
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

  const timelineDnd: TimelineDnd | undefined = dnd
    ? { ...dnd, rootIds: rootIdSet, sectionOf }
    : undefined;
  const listProps = {
    today,
    context,
    openId,
    onSelect,
    onOpenSection,
    renderHeaderActions,
    renderFooter,
    dnd: timelineDnd,
  };
  const unplanned = entries.filter((entry) => entry.kind === "unplanned");
  const layout = (
    <div className="flex h-full min-h-0 flex-col md:flex-row">
      <section
        aria-label="Planning calendar"
        className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain bg-surface p-md"
      >
        <DayList
          {...listProps}
          entries={entries.filter((entry) => entry.kind !== "unplanned")}
        />
      </section>
      <PlannerPanel count={unplanned[0]?.roots.length ?? 0}>
        <DayList {...listProps} entries={unplanned} />
      </PlannerPanel>
    </div>
  );
  return dnd ? (
    <DragSession dragType={TIMELINE_DRAG_TYPE} canMove={dnd.canMove}>
      {layout}
    </DragSession>
  ) : (
    layout
  );
}
