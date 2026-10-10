"use client";

import { RefObject, useEffect } from "react";

/** How near a scroller's top or bottom, in pixels, a drag starts scrolling it. */
export const SCROLL_BAND_PX = 100;

/** How fast, in pixels a second, a drag at a scroller's very edge scrolls it. */
export const MAX_SCROLL_PX_PER_S = 1000;

const MS_PER_S = 1000;

const SCROLLING_OVERFLOW = /auto|scroll/;

/** Where the top and bottom of what a scroller shows sit on the screen. */
type Edges = {
  readonly top: number;
  readonly bottom: number;
};

/**
 * I give how fast, in pixels a second, a drag at `pointerY` scrolls what
 * shows between `top` and `bottom`: up when negative, down when positive,
 * faster the nearer an edge, and not at all outside both bands.
 */
export function scrollSpeed(pointerY: number, { top, bottom }: Edges): number {
  const intoTop = top + SCROLL_BAND_PX - pointerY;
  const intoBottom = pointerY - (bottom - SCROLL_BAND_PX);
  const depth = intoTop > 0 ? -intoTop : Math.max(intoBottom, 0);
  return (
    MAX_SCROLL_PX_PER_S * Math.max(-1, Math.min(1, depth / SCROLL_BAND_PX))
  );
}

/** I give what scrolls an element: its nearest scrolling ancestor, or the page. */
function scrollerOf(element: Element): Element {
  let ancestor = element.parentElement;
  while (
    ancestor !== null &&
    !SCROLLING_OVERFLOW.test(getComputedStyle(ancestor).overflowY)
  ) {
    ancestor = ancestor.parentElement;
  }
  return ancestor ?? document.documentElement;
}

function edgesOf(scroller: Element): Edges {
  return scroller === document.documentElement
    ? { top: 0, bottom: window.innerHeight }
    : scroller.getBoundingClientRect();
}

/**
 * I scroll a scroller while a drag's pointer sits near its top or bottom,
 * from when I'm called until the function I return is.
 */
function scrollUnderDrag(scroller: Element): () => void {
  let pointerY: number | null = null;
  let frame: number | null = null;
  let lastFrame: number | null = null;
  let owed = 0;

  const step = (now: number) => {
    const speed =
      pointerY === null ? 0 : scrollSpeed(pointerY, edgesOf(scroller));
    if (speed === 0) {
      frame = null;
      lastFrame = null;
      owed = 0;
      return;
    }
    if (lastFrame !== null) {
      owed += (speed * (now - lastFrame)) / MS_PER_S;
      // A scroll of under a pixel can be dropped, so I only ask for whole ones.
      const whole = Math.trunc(owed);
      if (whole !== 0) scroller.scrollBy({ top: whole, behavior: "instant" });
      owed -= whole;
    }
    lastFrame = now;
    frame = requestAnimationFrame(step);
  };
  const onDragOver = (event: DragEvent) => {
    pointerY = event.clientY;
    frame ??= requestAnimationFrame(step);
  };
  const onDragLeave = (event: DragEvent) => {
    // With nothing entered, the drag has left the window.
    if (event.relatedTarget === null) pointerY = null;
  };

  // A drop zone keeps its dragover from bubbling, so I listen on the way down.
  document.addEventListener("dragover", onDragOver, true);
  document.addEventListener("dragleave", onDragLeave, true);
  return () => {
    document.removeEventListener("dragover", onDragOver, true);
    document.removeEventListener("dragleave", onDragLeave, true);
    if (frame !== null) cancelAnimationFrame(frame);
  };
}

/**
 * While `isDragging`, I scroll whatever scrolls `ref`'s element as the
 * drag's pointer nears its top or bottom.
 */
export function useDragScroll(
  ref: RefObject<Element | null>,
  isDragging: boolean,
): void {
  useEffect(
    () =>
      isDragging && ref.current !== null
        ? scrollUnderDrag(scrollerOf(ref.current))
        : undefined,
    [ref, isDragging],
  );
}
