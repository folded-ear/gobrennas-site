import { formatRecentDay } from "@/lib/dates";

/**
 * I describe how many times a recipe has been cooked, naming the day of
 * the last time.
 */
export function formatCookSummary(
  count: number,
  lastDoneAt: string,
  now: Date = new Date(),
): string {
  const day = formatRecentDay(lastDoneAt, now);
  if (count === 1) return `Cooked once ${day}`;
  const before = count === 2 ? "once" : `${count - 1} times`;
  return `Last cooked ${day}, and ${before} before`;
}
