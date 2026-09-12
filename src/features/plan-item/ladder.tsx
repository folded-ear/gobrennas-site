import {
  ancestorsOf,
  PlanContext,
  Separation,
} from "@/features/plan-timeline/context";
import { DateChip } from "./chips";

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

  let previous: string | null = null;
  return steps.map((step, depth) => {
    const chip = previous === null || step.date !== previous;
    previous = step.date;
    return { ...step, depth, chip };
  });
}

/** I name one step: the open item heads the drawer, its ancestry opens. */
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
export function Ladder({ context, id, onSelect }: LadderProps) {
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
          <LadderName
            line={line}
            isOpen={index === lastIndex}
            onSelect={onSelect}
          />
          {line.chip ? (
            <span className="ms-auto">
              <DateChip date={line.date} separation={line.separation} />
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
