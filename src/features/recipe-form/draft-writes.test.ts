import { describe, expect, it } from "vitest";
import { appendDirectionsText, appendIngredientLines } from "./draft-writes";
import { newIngredientDraft } from "./ingredient-draft";

describe("appending ingredient lines", () => {
  it("adds a row per line after rows that have text", () => {
    const flour = newIngredientDraft("2 cups flour");

    const { rows, arrived } = appendIngredientLines(
      [flour],
      ["1 cup RICOTTA", "2 large EGG YOLKS"],
    );

    expect(rows.map((it) => it.raw)).toEqual([
      "2 cups flour",
      "1 cup RICOTTA",
      "2 large EGG YOLKS",
    ]);
    expect(rows[0]).toBe(flour);
    expect(arrived).toEqual(rows.slice(1));
    expect(new Set(rows.map((it) => it.clientId)).size).toBe(3);
  });

  it("fills a blank last row with the first line, keeping its place", () => {
    const flour = newIngredientDraft("2 cups flour");
    const blank = newIngredientDraft("  ");

    const { rows, arrived } = appendIngredientLines(
      [flour, blank],
      ["1 cup RICOTTA", "2 large EGG YOLKS"],
    );

    expect(rows.map((it) => it.raw)).toEqual([
      "2 cups flour",
      "1 cup RICOTTA",
      "2 large EGG YOLKS",
    ]);
    expect(rows[1].clientId).toBe(blank.clientId);
    expect(arrived).toEqual(rows.slice(1));
  });

  it("leaves a blank row alone when it isn't last", () => {
    const blank = newIngredientDraft();
    const flour = newIngredientDraft("2 cups flour");

    const { rows } = appendIngredientLines([blank, flour], ["1 cup RICOTTA"]);

    expect(rows.map((it) => it.raw)).toEqual([
      "",
      "2 cups flour",
      "1 cup RICOTTA",
    ]);
  });

  it("appends to no rows at all", () => {
    const { rows, arrived } = appendIngredientLines([], ["1 cup RICOTTA"]);

    expect(rows.map((it) => it.raw)).toEqual(["1 cup RICOTTA"]);
    expect(arrived).toEqual(rows);
  });

  it("trims lines and skips blank ones", () => {
    const { rows } = appendIngredientLines(
      [],
      ["  1 cup RICOTTA ", "", "   ", "into 8 pieces"],
    );

    expect(rows.map((it) => it.raw)).toEqual([
      "1 cup RICOTTA",
      "into 8 pieces",
    ]);
  });

  it("changes nothing given only blank lines", () => {
    const rows = [newIngredientDraft()];

    expect(appendIngredientLines(rows, ["", "  "])).toEqual({
      rows,
      arrived: [],
    });
  });
});

describe("appending directions", () => {
  it("starts empty directions with the text", () => {
    expect(appendDirectionsText("", "Bring the cream to a boil.")).toBe(
      "Bring the cream to a boil.",
    );
  });

  it("adds the text as a paragraph of its own", () => {
    expect(
      appendDirectionsText("Make the filling.", "Bring the cream to a boil."),
    ).toBe("Make the filling.\n\nBring the cream to a boil.");
  });

  it("leaves directions as they are given blank text", () => {
    expect(appendDirectionsText("Make the filling.\n", "  ")).toBe(
      "Make the filling.\n",
    );
  });
});
