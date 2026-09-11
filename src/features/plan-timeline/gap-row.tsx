import { formatGapLabel } from "./dates";
import { TimelineGap } from "./model";

type GapRowProps = {
  gap: TimelineGap;
};

/** I stand in for a run of days carrying nothing, in one line. */
export function GapRow({ gap }: GapRowProps) {
  return (
    <li className="flex items-center gap-sm py-xxs text-sm text-muted">
      <span className="flex-1 border-t border-dashed border-separator" />
      {formatGapLabel(gap.days)}
      <span className="sr-only">with nothing planned</span>
      <span className="flex-1 border-t border-dashed border-separator" />
    </li>
  );
}
