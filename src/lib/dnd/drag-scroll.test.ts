import { describe, expect, it, vi } from "vitest";
import {
  MAX_SCROLL_PX_PER_S,
  SCROLL_BAND_PX,
  scrollSpeed,
  scrollUnderDrag,
} from "./drag-scroll";

// A scroller set down from the screen's top, as the item screen's body is,
// and tall enough that its two bands don't meet.
const TOP = 2 * SCROLL_BAND_PX;
const BOTTOM = TOP + 6 * SCROLL_BAND_PX;
const EDGES = { top: TOP, bottom: BOTTOM };

describe("scrollSpeed", () => {
  it("holds still with the pointer between the bands", () => {
    expect(scrollSpeed((TOP + BOTTOM) / 2, EDGES)).toBe(0);
  });

  it.each([
    ["top", TOP + SCROLL_BAND_PX],
    ["bottom", BOTTOM - SCROLL_BAND_PX],
  ])("holds still where the %s band starts", (_band, pointerY) => {
    expect(scrollSpeed(pointerY, EDGES)).toBe(0);
  });

  it("scrolls up at full speed at the top edge", () => {
    expect(scrollSpeed(TOP, EDGES)).toBe(-MAX_SCROLL_PX_PER_S);
  });

  it("scrolls down at full speed at the bottom edge", () => {
    expect(scrollSpeed(BOTTOM, EDGES)).toBe(MAX_SCROLL_PX_PER_S);
  });

  it("scrolls up at half speed halfway into the top band", () => {
    expect(scrollSpeed(TOP + SCROLL_BAND_PX / 2, EDGES)).toBe(
      -MAX_SCROLL_PX_PER_S / 2,
    );
  });

  it("scrolls down at half speed halfway into the bottom band", () => {
    expect(scrollSpeed(BOTTOM - SCROLL_BAND_PX / 2, EDGES)).toBe(
      MAX_SCROLL_PX_PER_S / 2,
    );
  });

  it("scrolls faster the nearer the pointer gets to an edge", () => {
    const shallow = scrollSpeed(BOTTOM - SCROLL_BAND_PX * 0.75, EDGES);
    const deep = scrollSpeed(BOTTOM - SCROLL_BAND_PX * 0.25, EDGES);

    expect(shallow).toBeGreaterThan(0);
    expect(deep).toBeGreaterThan(shallow);
  });

  it("scrolls no faster with the pointer past the top edge", () => {
    expect(scrollSpeed(TOP - SCROLL_BAND_PX, EDGES)).toBe(-MAX_SCROLL_PX_PER_S);
  });

  it("scrolls no faster with the pointer past the bottom edge", () => {
    expect(scrollSpeed(BOTTOM + SCROLL_BAND_PX, EDGES)).toBe(
      MAX_SCROLL_PX_PER_S,
    );
  });
});

describe("scrollUnderDrag", () => {
  it("scrolls the destination under the pointer when a drag crosses panels", () => {
    const source = document.createElement("div");
    const calendar = document.createElement("div");
    const day = document.createElement("div");
    calendar.append(day);
    document.body.append(source, calendar);
    for (const area of [source, calendar]) {
      area.style.overflowY = "auto";
      area.getBoundingClientRect = () => ({ top: 0, bottom: 500 }) as DOMRect;
      area.scrollBy = vi.fn();
    }
    let nextFrame: FrameRequestCallback | undefined;
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      nextFrame = callback;
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const stop = scrollUnderDrag();
    try {
      // jsdom has no native drag implementation. Dispatch the browser events
      // directly to exercise its capture listener and animation-frame timing.
      source.dispatchEvent(
        new MouseEvent("dragover", { bubbles: true, clientY: 490 }),
      );
      nextFrame!(0);
      nextFrame!(16);
      expect(source.scrollBy).toHaveBeenCalled();
      vi.mocked(source.scrollBy).mockClear();
      day.dispatchEvent(
        new MouseEvent("dragover", { bubbles: true, clientY: 490 }),
      );
      nextFrame!(32);
      nextFrame!(48);
      expect(calendar.scrollBy).toHaveBeenCalledWith({
        top: 14,
        behavior: "instant",
      });
      expect(source.scrollBy).not.toHaveBeenCalled();
    } finally {
      stop();
      source.remove();
      calendar.remove();
      vi.unstubAllGlobals();
    }
  });
});
