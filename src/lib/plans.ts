import { AccessLevel } from "@/__generated__/graphql";

/** A plan as far as ordering needs to know it. */
export type OrderablePlan = {
  readonly mine: boolean;
};

/**
 * I put plans in the order every view of several plans lists them: the
 * user's own, then those shared with them, each group in the order given.
 */
export function orderPlans<P extends OrderablePlan>(plans: readonly P[]): P[] {
  return [...plans.filter((it) => it.mine), ...plans.filter((it) => !it.mine)];
}

export type PlanAccess = {
  readonly mine: boolean;
  readonly grants: readonly {
    readonly level: AccessLevel;
    readonly user: { readonly me: boolean };
  }[];
};

const CHANGING_LEVELS: ReadonlySet<AccessLevel> = new Set([
  AccessLevel.CHANGE,
  AccessLevel.ADMINISTER,
]);

/** I tell whether the viewer may change a plan's items. */
export function canChangePlan(plan: PlanAccess): boolean {
  return (
    plan.mine ||
    plan.grants.some((g) => g.user.me && CHANGING_LEVELS.has(g.level))
  );
}

export function canAdministerPlan(plan: PlanAccess): boolean {
  return (
    plan.mine ||
    plan.grants.some(
      (grant) => grant.user.me && grant.level === AccessLevel.ADMINISTER,
    )
  );
}

/** Access levels from least to most, with what the planner calls them. */
export const ACCESS_LEVELS: readonly {
  readonly level: AccessLevel;
  readonly label: string;
}[] = [
  { level: AccessLevel.VIEW, label: "View" },
  { level: AccessLevel.CHANGE, label: "Modify" },
  { level: AccessLevel.ADMINISTER, label: "Administer" },
];

/** I name an access level the way the planner does. */
export function accessLevelLabel(level: AccessLevel): string {
  return ACCESS_LEVELS.find((it) => it.level === level)?.label ?? level;
}
