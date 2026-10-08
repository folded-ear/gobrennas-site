/** The mutation roots changes are made under, in the order they're sent. */
export const CHANGE_ROOTS = ["planner", "pantry"] as const;

export type Root = (typeof CHANGE_ROOTS)[number];

/** I give what the server answered for the change at position i. */
export function fieldResult<T>(data: unknown, i: number): T | undefined {
  const roots = data as Partial<Record<Root, Record<string, T> | null>> | null;
  for (const root of CHANGE_ROOTS) {
    const result = roots?.[root]?.[`s${i}`];
    if (result !== undefined && result !== null) return result;
  }
  return undefined;
}
