import type { Change, Stamper } from "./state";

/**
 * I give the changes with each status change stamped as the stamper says,
 * all as of the same now.
 */
export function stampChanges<C extends Change>(
  changes: readonly C[],
  stamper: Stamper,
  now: number,
): readonly C[] {
  return changes.map((it) =>
    it.kind === "status" ? { ...it, ...stamper(it, now) } : it,
  );
}
