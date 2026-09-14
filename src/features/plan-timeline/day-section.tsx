import { useDragSession } from "@/features/plan-dnd/drag-session";
import { ZoneSpec } from "@/features/plan-dnd/zone-layer";
import { WHOLE_ZONE } from "@/features/plan-dnd/zones";
import { PlanContext } from "./context";
import { TimelineDay } from "./model";
import { sectionLabel } from "./section-label";
import { SectionShell } from "./section-shell";
import { TimelineDnd } from "./timeline-row";

type DaySectionProps = {
  day: TimelineDay;
  isToday: boolean;
  context: PlanContext;
  /** The item open in its screen, marked wherever it shows. */
  openId?: string;
  onSelect?: (id: string) => void;
  /** Opens a section by its key. Left out, no section opens. */
  onOpenSection?: (key: string) => void;
  /** Left out, nothing can be dragged. */
  dnd?: TimelineDnd;
};

/** I label one calendar day and show whatever it holds. */
export function DaySection({
  day,
  isToday,
  context,
  openId,
  onSelect,
  onOpenSection,
  dnd,
}: DaySectionProps) {
  const { dragged } = useDragSession();
  const label = sectionLabel(day);
  const zones: readonly ZoneSpec[] =
    dnd && dragged && dnd.sectionOf.get(dragged.id) !== day.date
      ? [
          {
            rect: WHOLE_ZONE,
            indicator: "fill",
            label: `Move to ${label}`,
            onDrop: () =>
              dnd.moves.moveToDate(dragged.id, day.date, dragged.name),
          },
        ]
      : [];

  return (
    <SectionShell
      label={label}
      emphasized={isToday}
      ariaCurrent={isToday ? "date" : undefined}
      roots={day.roots}
      zones={zones}
      sectionKey={day.date}
      context={context}
      openId={openId}
      onSelect={onSelect}
      onOpenSection={onOpenSection}
      dnd={dnd}
    />
  );
}
