import { useDragSession } from "@/features/plan-dnd/drag-session";
import { ZoneLayer, ZoneSpec } from "@/features/plan-dnd/zone-layer";
import { WHOLE_ZONE } from "@/features/plan-dnd/zones";
import { PlanItemTree } from "@/features/plan-item/tree";
import clsx from "clsx";
import { PlanContext } from "./context";
import { formatDayLabel } from "./dates";
import { TimelineDay } from "./model";
import { TimelineDnd, TimelineRow } from "./timeline-row";

type DaySectionProps = {
  day: TimelineDay;
  isToday: boolean;
  context: PlanContext;
  /** The item open in the drawer, marked wherever it shows. */
  openId?: string;
  onSelect?: (id: string) => void;
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
  dnd,
}: DaySectionProps) {
  const { dragged } = useDragSession();
  const label = formatDayLabel(day.date);
  const zones: readonly ZoneSpec[] =
    dnd && dragged && dnd.dayOf.get(dragged.id) !== day.date
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
    <li aria-current={isToday ? "date" : undefined} className="relative py-xxs">
      <h3
        className={clsx(
          "border-b py-xxs text-sm",
          isToday
            ? "border-accent font-semibold text-accent"
            : "border-separator font-normal text-muted",
        )}
      >
        {label}
      </h3>
      {day.roots.length === 0 ? (
        // Room to read the day as somewhere an item could go.
        <div className="h-xl" />
      ) : (
        <div className="py-xs">
          <PlanItemTree
            nodes={day.roots}
            renderItem={(node) => (
              <TimelineRow
                node={node}
                date={day.date}
                context={context}
                openId={openId}
                dnd={dnd}
                onSelect={onSelect}
              />
            )}
          />
        </div>
      )}
      <ZoneLayer zones={zones} />
    </li>
  );
}
