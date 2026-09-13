/** A plan as a picker offers it. */
export type PickablePlan = {
  readonly id: string;
  readonly mine: boolean;
};

export type SelectionMode = "single" | "multiple";

/**
 * I put plans in the order a picker lists them: the user's own, then those
 * shared with them, each group in the order given.
 */
export function pickerOrder<P extends PickablePlan>(plans: readonly P[]): P[] {
  return [...plans.filter((it) => it.mine), ...plans.filter((it) => !it.mine)];
}

/**
 * I settle which plans are selected, given the IDs a preference stored: the
 * stored plans still accessible, in picker order, or the first plan when
 * none are. In single mode I pick the first stored plan still accessible.
 */
export function resolveSelection(
  stored: readonly string[],
  plans: readonly PickablePlan[],
  mode: SelectionMode,
): string[] {
  const ordered = pickerOrder(plans);
  const accessible = new Set(ordered.map((it) => it.id));
  const kept = stored.filter((id) => accessible.has(id));
  if (kept.length === 0) {
    return ordered.length > 0 ? [ordered[0].id] : [];
  }
  if (mode === "single") return [kept[0]];
  const chosen = new Set(kept);
  return ordered.filter((it) => chosen.has(it.id)).map((it) => it.id);
}
