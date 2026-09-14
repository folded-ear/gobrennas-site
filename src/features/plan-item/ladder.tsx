import { PlanDot } from "@/components/plan-dot";
import { useItemPlan, useShowsPlanIndicators } from "@/features/plan-directory";
import {
  ancestorsOf,
  PlanContext,
  Separation,
} from "@/features/plan-timeline/context";
import { DateChip } from "./chips";
import { CookLink } from "./cook-link";

/** One step of the walk from a plan's root down to the open item. */
export type LadderLine = {
  readonly id: string;
  readonly name: string;
  readonly date: string | null;
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
  /** Whether anything sits below the open item, so it can be cooked. */
  readonly openHasChildren?: boolean;
};

type LadderNameProps = {
  readonly line: LadderLine;
  readonly isOpen: boolean;
  readonly onSelect?: (id: string) => void;
};

/** Each step sits one of these in from the one above it. */
const STEP_INDENT = "var(--spacing-md)";

/** I give the walk from a plan's root down to one item, that item included. */
export function ladderLines(
  context: PlanContext,
  id: string,
): readonly LadderLine[] {
  const own = context.get(id);
  if (own === undefined) return [];

  const steps = [
    ...ancestorsOf(context, id).map((ancestor) => ({
      id: ancestor.id,
      name: ancestor.name,
      date: ancestor.date,
      separation: context.get(ancestor.id)?.separation ?? null,
    })),
    { id, name: own.name, date: own.date, separation: own.separation },
  ];

  const lines: LadderLine[] = [];
  let previousDate: string | null = null;
  for (const [depth, step] of steps.entries()) {
    const chip =
      step.date !== null && (depth === 0 || step.date !== previousDate);
    lines.push({ ...step, depth, chip });
    previousDate = step.date;
  }
  return lines;
}

/** I name one step: the open item heads its screen, its ancestry opens. */
function LadderName({ line, isOpen, onSelect }: LadderNameProps) {
  if (isOpen) {
    return (
      <h2 className="text-xl font-semibold text-foreground">{line.name}</h2>
    );
  }
  if (onSelect) {
    return (
      <button
        type="button"
        className="text-left text-sm text-muted hover:text-accent"
        onClick={() => onSelect(line.id)}
      >
        {line.name}
      </button>
    );
  }
  return <span className="text-sm text-muted">{line.name}</span>;
}

/**
 * I show where the open item sits in its plan, naming every step down to
 * it and saying the date wherever it changes.
 */
export function Ladder({
  context,
  id,
  onSelect,
  openHasChildren = false,
}: LadderProps) {
  const plan = useItemPlan(id);
  const showsPlan = useShowsPlanIndicators();
  const lines = ladderLines(context, id);
  if (lines.length === 0) return null;
  const lastIndex = lines.length - 1;

  return (
    <ol className="flex flex-col gap-xxs">
      {lines.map((line, index) => (
        <li
          key={line.id}
          className="flex items-start gap-sm"
          style={{ paddingInlineStart: `calc(${STEP_INDENT} * ${line.depth})` }}
        >
          {index === lastIndex && showsPlan && plan ? (
            // Sized to the heading it sits beside, not the line around it.
            <span className="flex items-start text-xl">
              <PlanDot plan={plan} className="me-xs" />
              <LadderName line={line} isOpen onSelect={onSelect} />
            </span>
          ) : (
            <LadderName
              line={line}
              isOpen={index === lastIndex}
              onSelect={onSelect}
            />
          )}
          {/* every step above the open item holds the step below it */}
          {plan !== undefined && (index < lastIndex || openHasChildren) ? (
            <CookLink planId={plan.id} itemId={line.id} name={line.name} />
          ) : null}
          {line.chip && line.date !== null ? (
            <span className="ms-auto">
              <DateChip date={line.date} separation={line.separation} />
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
