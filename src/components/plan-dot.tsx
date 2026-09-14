import clsx from "clsx";

type DottedPlan = {
  readonly id: string;
  readonly name: string;
  readonly color: string;
};

const STACK_LABEL = "Plans";

type DotProps = {
  plan: DottedPlan;
  className?: string;
};

function Dot({ plan, className }: DotProps) {
  return (
    <span
      role="img"
      aria-label={plan.name}
      title={plan.name}
      className={clsx("size-[0.6em] shrink-0 rounded-full", className)}
      style={{ backgroundColor: plan.color }}
    />
  );
}

type PlanDotProps = {
  plan: DottedPlan;
};

/**
 * I mark something as belonging to a plan: a dot in its color, sized to the
 * text around me, so I never make a line any taller.
 */
export function PlanDot({ plan }: PlanDotProps) {
  return (
    <span className="inline-flex h-[1lh] shrink-0 items-center align-top">
      <Dot plan={plan} />
    </span>
  );
}

type PlanDotStackProps = {
  plans: readonly DottedPlan[];
};

/** I mark something as belonging to several plans, their dots overlapping. */
export function PlanDotStack({ plans }: PlanDotStackProps) {
  return (
    <span
      role="group"
      aria-label={STACK_LABEL}
      className="inline-flex h-[1lh] shrink-0 items-center align-top"
    >
      {plans.map((plan) => (
        <Dot
          key={plan.id}
          plan={plan}
          // half of a dot's width, ringed so each edge stays clear
          className="-ms-[0.3em] ring-[0.1em] ring-background first:ms-0"
        />
      ))}
    </span>
  );
}
