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
