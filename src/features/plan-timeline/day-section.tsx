import { PlanItemTree } from "@/features/plan-item/tree";
import clsx from "clsx";
import { formatDayLabel } from "./dates";
import { TimelineDay } from "./model";

type DaySectionProps = {
  day: TimelineDay;
  isToday: boolean;
  onSelect?: (id: string) => void;
};

/** I label one calendar day and show whatever it holds. */
export function DaySection({ day, isToday, onSelect }: DaySectionProps) {
  return (
    <li aria-current={isToday ? "date" : undefined} className="py-xxs">
      <h3
        className={clsx(
          "border-b py-xxs text-sm",
          isToday
            ? "border-accent font-semibold text-accent"
            : "border-separator font-normal text-muted",
        )}
      >
        {formatDayLabel(day.date)}
      </h3>
      {day.roots.length === 0 ? (
        // Room to read the day as somewhere an item could go. It becomes
        // a drop target once the planner can move items.
        <div className="h-xl" />
      ) : (
        <div className="py-xs">
          <PlanItemTree nodes={day.roots} onSelect={onSelect} />
        </div>
      )}
    </li>
  );
}
