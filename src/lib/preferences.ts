export const PREF_ACTIVE_PLAN = "activePlan";
export const PREF_NAV_COLLAPSED = "navCollapsed";

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
