import { PlanDot } from "@/components/plan-dot";
import {
  DirectoryPlan,
  useItemPlan,
  useShowsPlanIndicators,
} from "@/features/plan-directory";
import { EditableName } from "@/features/plan-edit";
import { StatusButton, useItemStatus } from "@/features/plan-status";
import {
  ancestorsOf,
  PlanContext,
  Separation,
} from "@/features/plan-timeline/context";
import clsx from "clsx";
import { DateChip } from "./chips";
import { CookLink } from "./cook-link";
import { NameText } from "./item-name";

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
  /** Called when an edit deletes the open item. */
  readonly onRemoved?: () => void;
};

type LadderNameProps = {
  readonly line: LadderLine;
  readonly onSelect?: (id: string) => void;
};

type OpenNameProps = {
  readonly line: LadderLine;
  readonly plan: DirectoryPlan | undefined;
  readonly hasChildren: boolean;
  readonly onRemoved?: () => void;
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

/** I head the item screen with the open item, its name edited in place. */
function OpenName({ line, plan, hasChildren, onRemoved }: OpenNameProps) {
  const status = useItemStatus(line.id);
  return (
    <h2 className="flex min-w-0 text-xl font-semibold text-foreground">
      {plan !== undefined ? (
        <EditableName
          itemId={line.id}
          planId={plan.id}
          name={line.name}
          hasChildren={hasChildren}
          canEdit={
            plan.changeable &&
            status !== null &&
            !status.inert &&
            status.pendingStatus === null
          }
          keys="heading"
          onRemoved={onRemoved}
        >
          <NameText name={line.name} />
        </EditableName>
      ) : (
        <NameText name={line.name} />
      )}
    </h2>
  );
}

/** I name one step above the open item, opening it when chosen. */
function LadderName({ line, onSelect }: LadderNameProps) {
  if (onSelect) {
    return (
      <button
        type="button"
        className="text-left text-muted hover:text-accent"
        onClick={() => onSelect(line.id)}
      >
        <NameText name={line.name} />
      </button>
    );
  }
  return (
    <span className="text-muted">
      <NameText name={line.name} />
    </span>
  );
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
  onRemoved,
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
          className={clsx(
            "flex items-center gap-sm",
            index === lastIndex ? "text-xl" : "text-sm",
          )}
          style={{ paddingInlineStart: `calc(${STEP_INDENT} * ${line.depth})` }}
        >
          {index === lastIndex ? (
            <span className="flex min-w-0 items-center gap-xxs">
              {plan !== undefined ? (
                <StatusButton
                  itemId={line.id}
                  planId={plan.id}
                  canChange={plan.changeable}
                />
              ) : null}
              <OpenName
                line={line}
                plan={plan}
                hasChildren={openHasChildren}
                onRemoved={onRemoved}
              />
              {showsPlan && plan ? (
                <PlanDot plan={plan} className="ms-xxs" />
              ) : null}
            </span>
          ) : (
            <LadderName line={line} onSelect={onSelect} />
          )}
          {/* every step above the open item holds the step below it */}
          {plan !== undefined && (index < lastIndex || openHasChildren) ? (
            <CookLink planId={plan.id} itemId={line.id} name={line.name} />
          ) : null}
          {line.chip && line.date !== null ? (
            <span className="ms-auto flex shrink-0">
              <DateChip date={line.date} separation={line.separation} />
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
