import { useRef, useState, type PointerEvent } from "react";
import {
  boxBetween,
  overlaps,
  viewPoint,
  type Box,
  type Point,
} from "./geometry";

/** Which lines are selected, by their place among the job's lines. */
export type Selection = ReadonlySet<number>;

const NOTHING: Selection = new Set();

type Press = {
  readonly pointerId: number;
  readonly start: Point;
  /** What was selected before I began. */
  readonly before: Selection;
};

function sameLines(a: Selection, b: Selection): boolean {
  return a.size === b.size && [...a].every((it) => b.has(it));
}

/**
 * I select lines by pointer, over a layer their view-space boxes are drawn
 * on. A press draws a rectangle from where it began to where it is, and the
 * lines it touches become the selection; a tap is a rectangle of no size.
 * A second pointer, or a cancelled press, puts the selection back.
 */
export function useLineSelection(
  viewBoxes: readonly Box[],
  onSelect: (selected: Selection) => void,
) {
  const [selected, setSelected] = useState(NOTHING);
  const [drawn, setDrawn] = useState<Box | null>(null);
  const latest = useRef(selected);
  const press = useRef<Press | null>(null);

  function select(next: Selection) {
    if (sameLines(latest.current, next)) return;
    latest.current = next;
    setSelected(next);
    onSelect(next);
  }

  function draw(rect: Box) {
    setDrawn(rect);
    const touched = new Set<number>();
    viewBoxes.forEach((box, i) => {
      if (overlaps(rect, box)) touched.add(i);
    });
    select(touched);
  }

  function drop(dropped: Press) {
    press.current = null;
    setDrawn(null);
    select(dropped.before);
  }

  // The layer is measured as each event arrives, so no size is ever stored.
  const pointOf = (event: PointerEvent<Element>) =>
    viewPoint(event, event.currentTarget.getBoundingClientRect());

  const pressOf = (event: PointerEvent<Element>) =>
    press.current?.pointerId === event.pointerId ? press.current : null;

  return {
    selected,
    /** The rectangle now being drawn, in view space. */
    drawn,
    handlers: {
      onPointerDown(event: PointerEvent<Element>) {
        if (press.current !== null) {
          drop(press.current);
          return;
        }
        if (event.pointerType === "mouse" && event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        const start = pointOf(event);
        press.current = {
          pointerId: event.pointerId,
          start,
          before: latest.current,
        };
        draw(boxBetween(start, start));
      },
      onPointerMove(event: PointerEvent<Element>) {
        const pressed = pressOf(event);
        if (pressed !== null) draw(boxBetween(pressed.start, pointOf(event)));
      },
      onPointerUp(event: PointerEvent<Element>) {
        if (pressOf(event) === null) return;
        press.current = null;
        setDrawn(null);
      },
      onPointerCancel(event: PointerEvent<Element>) {
        const pressed = pressOf(event);
        if (pressed !== null) drop(pressed);
      },
    },
  };
}
