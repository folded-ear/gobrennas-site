import { describe, expect, it } from "vitest";
import {
  MAX_SCROLL_PX_PER_S,
  SCROLL_BAND_PX,
  scrollSpeed,
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
