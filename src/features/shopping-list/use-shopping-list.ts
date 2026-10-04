import { ToggleStatus } from "@/features/plan-status";
import { useEffect, useEffectEvent, useMemo, useState } from "react";
import {
  buildShoppingList,
  ShoppingList,
  ShoppingPlan,
  statusesOf,
  toggleFlips,
} from "./model";

type ShoppingListState = {
  readonly list: ShoppingList;
  /** I let every held row go, so each shows where its status puts it. */
  readonly sweep: () => void;
};

type Seen = {
  readonly planKey: string;
  readonly statuses: ReadonlyMap<string, ToggleStatus>;
};

const NONE_HELD: ReadonlySet<string> = new Set();

/**
 * I build the shopping list for the given plans, holding each row whose
 * status flips where it was until a sweep. The window losing focus sweeps,
 * and changing which plans are shopped starts over.
 */
export function useShoppingList(
  plans: readonly ShoppingPlan[],
): ShoppingListState {
  const planKey = plans.map((it) => it.id).join();
  const [held, setHeld] = useState(NONE_HELD);
  const list = useMemo(() => buildShoppingList(plans, held), [plans, held]);
  const statuses = statusesOf(list);
  const [seen, setSeen] = useState<Seen>({ planKey, statuses });
  if (seen.planKey !== planKey) {
    setSeen({ planKey, statuses });
    setHeld(NONE_HELD);
  } else if (!sameStatuses(seen.statuses, statuses)) {
    setSeen({ planKey, statuses });
    setHeld(toggleFlips(held, seen.statuses, statuses));
  }

  const sweep = () => setHeld(NONE_HELD);
  const onBlur = useEffectEvent(sweep);
  useEffect(() => {
    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, []);

  return { list, sweep };
}

function sameStatuses(
  a: ReadonlyMap<string, ToggleStatus>,
  b: ReadonlyMap<string, ToggleStatus>,
): boolean {
  if (a.size !== b.size) return false;
  for (const [key, status] of a) {
    if (b.get(key) !== status) return false;
  }
  return true;
}
