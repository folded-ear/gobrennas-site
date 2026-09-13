export const PREF_ACTIVE_PLAN = "activePlan";
export const PREF_PLANNER_PLANS = "plannerPlans";

const TRUE_WORDS = ["true", "t", "yes", "y"];
const FALSE_WORDS = ["false", "f", "no", "n"];

/**
 * I read a BOOLEAN preference's string value generously, as the schema asks:
 * the usual words in any case, and any number, where only zero is false.
 * Anything I can't make sense of is false.
 */
export function parseBoolean(value: string | null | undefined): boolean {
  if (value == null) return false;
  const word = value.trim().toLowerCase();
  if (TRUE_WORDS.includes(word)) return true;
  if (FALSE_WORDS.includes(word)) return false;
  const n = Number(word);
  return word.length > 0 && !isNaN(n) && n !== 0;
}

/**
 * I write a boolean as a BOOLEAN preference's string value.
 */
export function formatBoolean(value: boolean): string {
  return value ? "true" : "false";
}

/**
 * I read a SET_OF_IDS preference's string value: a JSON list of IDs, quoted
 * or not. I skip anything in it that isn't an ID and keep each ID once, in
 * first-seen order. A value I can't make sense of is no IDs.
 */
export function parseIdSet(value: string | null | undefined): string[] {
  if (value == null) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const ids = parsed
    .filter((it) => typeof it === "string" || typeof it === "number")
    .map(String);
  return [...new Set(ids)];
}

/**
 * I write IDs as a SET_OF_IDS preference's string value.
 */
export function formatIdSet(ids: readonly string[]): string {
  return JSON.stringify(ids);
}
