import { ZoneRect } from "../zones";

// Sample a grid of points across a row and count which zones claim each.
const STEPS = 20;

/** I count the zones claiming a point of a row. */
export function claims(
  rects: readonly ZoneRect[],
  x: number,
  y: number,
): number {
  return rects.filter(
    (r) =>
      x >= r.left && x < r.left + r.width && y >= r.top && y < r.top + r.height,
  ).length;
}

/** I check every point of a grid across a row. */
export function everyPoint(check: (x: number, y: number) => void) {
  for (let i = 0; i < STEPS; i++) {
    for (let j = 0; j < STEPS; j++) {
      check((i + 0.5) / STEPS, (j + 0.5) / STEPS);
    }
  }
}
