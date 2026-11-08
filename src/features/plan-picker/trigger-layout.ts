/** I'm how many other selected plans show side by side before they stack. */
const MOST_SIDE_BY_SIDE = 3;

/** I'm how many avatars recently toggled plans fill a row out to. */
const FILLED_ROW = 4;

/** I'm a plan with its own avatar in a multiple-selection picker. */
export type OwnAvatar<P> = {
  readonly plan: P;
  /**
   * I'm how many avatars show once my plan is added to fill out the row; I'm
   * set only for an unselected plan shown because it was toggled recently.
   */
  readonly fillSlot?: number;
};

/** I'm what one side of a multiple-selection picker shows. */
export type TriggerSide<P> = {
  /** I'm the plans with their own avatar, in the order they show. */
  readonly own: readonly OwnAvatar<P>[];
  /** I'm the selected plans overlapping in one stack after `own`, if any. */
  readonly stacked: readonly P[];
};

/**
 * I lay out one side of a multiple-selection picker from its plans in
 * order, the selected plans, and the plans toggled most recently first.
 *
 * The latest plan toggled always has its own avatar. The other selected
 * plans show beside it in order, or past three, stack after it. Short of
 * four avatars, I add recently unselected plans, latest first, until there
 * are four.
 */
export function layoutTriggerSide<P extends { readonly id: string }>(
  plans: readonly P[],
  selectedIds: readonly string[],
  recentIds: readonly string[],
): TriggerSide<P> {
  const selected = new Set(selectedIds);
  const recent = recentIds.filter((id) => plans.some((it) => it.id === id));
  const latest = recent.at(0);
  const rest = plans.filter((it) => selected.has(it.id) && it.id !== latest);
  if (rest.length > MOST_SIDE_BY_SIDE) {
    return {
      own: plans.filter((it) => it.id === latest).map((plan) => ({ plan })),
      stacked: rest,
    };
  }

  const fillSlots = new Map<string, number>();
  let shown = rest.length + (latest === undefined ? 0 : 1);
  for (const id of recent.slice(1)) {
    if (shown >= FILLED_ROW) break;
    if (!selected.has(id)) fillSlots.set(id, ++shown);
  }
  const own = plans
    .filter(
      (it) => it.id === latest || rest.includes(it) || fillSlots.has(it.id),
    )
    .map((plan) => {
      const fillSlot = fillSlots.get(plan.id);
      return fillSlot === undefined ? { plan } : { plan, fillSlot };
    });
  return { own, stacked: [] };
}
