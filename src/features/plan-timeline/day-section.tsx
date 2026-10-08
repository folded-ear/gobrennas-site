import { useBucketPlans } from "@/features/plan-directory";
import { useDragSession } from "@/lib/dnd/drag-session";
import { ZoneSpec } from "@/lib/dnd/zone-layer";
import { WHOLE_ZONE } from "@/lib/dnd/zones";
import type { ReactNode } from "react";
import { BucketCookLink } from "./bucket-cook-link";
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
  footer?: ReactNode;
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
  footer,
  dnd,
}: DaySectionProps) {
  const { dragged } = useDragSession();
  const label = sectionLabel(day);
  const plans = useBucketPlans(day.bucketIds);
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
      action={
        <BucketCookLink section={day} planIds={plans.map((plan) => plan.id)} />
      }
      emphasized={isToday}
      ariaCurrent={isToday ? "date" : undefined}
      roots={day.roots}
      zones={zones}
      sectionKey={day.date}
      context={context}
      openId={openId}
      onSelect={onSelect}
      onOpenSection={onOpenSection}
      footer={footer}
      dnd={dnd}
    />
  );
}
