/** Keep a stable prefix, reserving room for overflow only when needed. */
export function visiblePlanCount(
  available: number,
  widths: readonly number[],
  overflowWidth: number,
  gap: number,
): number {
  const total =
    widths.reduce((sum, width) => sum + width, 0) +
    Math.max(0, widths.length - 1) * gap;
  if (total <= available) return widths.length;
  let used = overflowWidth;
  let count = 0;
  for (const width of widths) {
    if (used + gap + width > available) break;
    used += gap + width;
    count++;
  }
  return count;
}
