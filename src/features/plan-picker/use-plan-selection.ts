import { usePreference } from "@/hooks/use-preference";
import { useSetPreference } from "@/hooks/use-set-preference";
import { formatIdSet, parseIdSet } from "@/lib/preferences";
import { useCallback, useEffect, useMemo } from "react";
import { PickablePlan, resolveSelection, SelectionMode } from "./selection";

function parse(value: string | null | undefined, mode: SelectionMode) {
  if (mode === "multiple") return parseIdSet(value);
  return value ? [value] : [];
}

function format(ids: readonly string[], mode: SelectionMode) {
  return mode === "multiple" ? formatIdSet(ids) : (ids[0] ?? "");
}

/**
 * I keep a plan selection in a preference: an ID preference in single mode,
 * a SET_OF_IDS one in multiple mode. When what's stored selects no plan the
 * user can reach, I select the first one and store that, so a selection is
 * never empty while there's a plan to select.
 */
export function usePlanSelection(
  preferenceName: string,
  plans: readonly PickablePlan[],
  mode: SelectionMode,
): [string[], (ids: string[]) => void] {
  const stored = usePreference(preferenceName);
  const [setPreference] = useSetPreference(preferenceName);
  const ids = useMemo(
    () => resolveSelection(parse(stored, mode), plans, mode),
    [stored, plans, mode],
  );

  const needsFilling = ids.length > 0 && parse(stored, mode).length === 0;
  const filling = needsFilling ? format(ids, mode) : null;
  useEffect(() => {
    if (filling !== null) setPreference(filling);
  }, [filling, setPreference]);

  const setIds = useCallback(
    (next: string[]) => setPreference(format(next, mode)),
    [setPreference, mode],
  );
  return [ids, setIds];
}
