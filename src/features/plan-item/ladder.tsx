import { PlanContext, Separation } from "@/features/plan-timeline/context";

/** One step of the walk from a plan's root down to the open item. */
export type LadderLine = {
  readonly id: string;
  readonly name: string;
  readonly date: string;
  readonly separation: Separation | null;
  /** How far below the root I sit. */
  readonly depth: number;
  /** Whether my date needs saying, or the step above already said it. */
  readonly chip: boolean;
};

type LadderProps = {
  readonly context: PlanContext;
  /** The open item, the walk's last step. */
  readonly id: string;
  /** Left out, no step can be opened. */
  readonly onSelect?: (id: string) => void;
};

/** I give the walk from a plan's root down to one item, that item included. */
export function ladderLines(
  context: PlanContext,
  id: string,
): readonly LadderLine[] {
  void context;
  void id;
  return [];
}

/**
 * I show where the open item sits in its plan, naming every step down to
 * it and saying the date wherever it changes.
 */
export function Ladder({ context, id, onSelect }: LadderProps) {
  void context;
  void id;
  void onSelect;
  return null;
}
