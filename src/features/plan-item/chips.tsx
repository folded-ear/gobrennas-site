import { Separation } from "@/features/plan-timeline/context";
import { formatDayLabel } from "@/features/plan-timeline/dates";
import { Chip } from "@heroui/react";

type DateChipProps = {
  readonly date: string;
  /** How my date sits against my parent's, or nothing when they agree. */
  readonly separation?: Separation | null;
};

type ParentChipProps = {
  readonly name: string;
};

/** I show the day something happens, warning when it comes too late. */
export function DateChip({ date, separation }: DateChipProps) {
  if (separation === "late") {
    return (
      <Chip size="sm" color="warning">
        {formatDayLabel(date)}
        {/* True of whichever end of the pair I am shown against. */}
        <span className="sr-only">, out of order</span>
      </Chip>
    );
  }
  return (
    <Chip size="sm" variant="secondary">
      {formatDayLabel(date)}
    </Chip>
  );
}

/** I name the item something sits under. */
export function ParentChip({ name }: ParentChipProps) {
  return (
    <Chip size="sm" variant="secondary">
      {name}
    </Chip>
  );
}
