import type { Box } from "./geometry";

/**
 * I compare two lines' view-space boxes for reading order. They sit in
 * different columns when the one further left is narrower than how far
 * apart their left edges are; columns read left to right. Otherwise the
 * higher line reads first.
 */
export function byReadingOrder(a: Box, b: Box): number {
  const down = a.top - b.top;
  const across = a.left - b.left;
  const inColumns = across < 0 ? a.width < -across : b.width < across;
  return inColumns ? across : down;
}

/**
 * I put lines in reading order by their view-space boxes. The order of a
 * set depends on which lines are in it, since that's what shows columns.
 */
export function inReadingOrder<T>(
  lines: readonly T[],
  viewBoxOf: (line: T) => Box,
): T[] {
  return [...lines].sort((a, b) => byReadingOrder(viewBoxOf(a), viewBoxOf(b)));
}
