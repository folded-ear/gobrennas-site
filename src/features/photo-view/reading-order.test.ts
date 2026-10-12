import { describe, expect, it } from "vitest";
import { overlaps, toView, type Box, type QuarterTurns } from "./geometry";
import { inReadingOrder } from "./reading-order";
import { COOKBOOK_PAGE_LINES, COOKBOOK_PAGE_PARTS } from "./test/cookbook-page";

/** The quarter turn that sets the cookbook page upright. */
const UPRIGHT: QuarterTurns = 1;
const WHOLE_PAGE: Box = { left: 0, top: 0, width: 1, height: 1 };

/** I read the lines a view-space rectangle touches, at a turn. */
const read = (rect: Box, q: QuarterTurns = UPRIGHT) =>
  inReadingOrder(
    COOKBOOK_PAGE_LINES.filter((it) => overlaps(rect, toView(it.box, q))),
    (it) => toView(it.box, q),
  ).map((it) => it.text);

/** The names of a part's lines, top to bottom. */
const part = (name: keyof typeof COOKBOOK_PAGE_PARTS, from = 1, to?: number) =>
  Array.from(
    { length: (to ?? COOKBOOK_PAGE_PARTS[name]) - from + 1 },
    (_, i) => `${name} ${String(from + i).padStart(2, "0")}`,
  );

describe("reading order", () => {
  it("reads one column top to bottom, however the API ordered its lines", () => {
    const leftColumn = { left: 0, top: 0.187, width: 0.5, height: 0.8 };

    expect(read(leftColumn)).toEqual(part("left"));
  });

  it("reads a block within a column in order", () => {
    const ingredients = { left: 0.17, top: 0.31, width: 0.35, height: 0.31 };

    expect(read(ingredients)).toEqual(part("left", 7, 21));
  });

  it("reads the left column's lines before the right's, across both", () => {
    const band = { left: 0.17, top: 0.31, width: 0.6, height: 0.1 };

    expect(read(band)).toEqual([
      ...part("left", 7, 11),
      ...part("right", 7, 13),
    ]);
  });

  it("reads a whole page: the title, then each column", () => {
    expect(read(WHOLE_PAGE)).toEqual([
      ...part("title"),
      ...part("left"),
      ...part("right"),
    ]);
  });

  it("reads differently while the page is still sideways", () => {
    expect(read(WHOLE_PAGE, 0)).not.toEqual(read(WHOLE_PAGE));
  });

  it("leaves the lines it was given as they were", () => {
    const given = [...COOKBOOK_PAGE_LINES];

    inReadingOrder(given, (it) => toView(it.box, UPRIGHT));

    expect(given).toEqual(COOKBOOK_PAGE_LINES);
  });
});
