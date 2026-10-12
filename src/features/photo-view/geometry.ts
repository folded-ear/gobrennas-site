/** A rectangle, as fractions of its space's width and height. */
export type Box = {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
};

/** A place, as fractions of its space's width and height. */
export type Point = { readonly x: number; readonly y: number };

/** How far a photo is turned from how it was taken, clockwise. */
export type QuarterTurns = 0 | 1 | 2 | 3;

const FULL_TURN = 4;

/** I turn a photo a quarter further, clockwise or back. */
export function turn(q: QuarterTurns, by: 1 | -1): QuarterTurns {
  return ((q + by + FULL_TURN) % FULL_TURN) as QuarterTurns;
}

/** I tell whether a turned photo's width lies along its view's height. */
export function isSideways(q: QuarterTurns): boolean {
  return q % 2 === 1;
}

/**
 * I map a box from photo space, as the photo was taken, into view space,
 * as it's shown after q quarter turns.
 */
export function toView(box: Box, q: QuarterTurns): Box {
  switch (q) {
    case 0:
      return box;
    case 1:
      return {
        left: 1 - box.top - box.height,
        top: box.left,
        width: box.height,
        height: box.width,
      };
    case 2:
      return {
        left: 1 - box.left - box.width,
        top: 1 - box.top - box.height,
        width: box.width,
        height: box.height,
      };
    case 3:
      return {
        left: box.top,
        top: 1 - box.left - box.width,
        width: box.height,
        height: box.width,
      };
  }
}

/** I tell whether two boxes touch or overlap. */
export function overlaps(a: Box, b: Box): boolean {
  return (
    a.left + a.width >= b.left &&
    a.left <= b.left + b.width &&
    a.top + a.height >= b.top &&
    a.top <= b.top + b.height
  );
}

/** I give the box with two points at opposite corners. */
export function boxBetween(a: Point, b: Point): Box {
  return {
    left: Math.min(a.x, b.x),
    top: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  };
}

/**
 * I give where a pointer is in view space, from where the view's layer is
 * on screen right now.
 */
export function viewPoint(
  pointer: { readonly clientX: number; readonly clientY: number },
  layer: Box,
): Point {
  return {
    x: (pointer.clientX - layer.left) / layer.width,
    y: (pointer.clientY - layer.top) / layer.height,
  };
}
