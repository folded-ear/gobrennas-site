import { describe, expect, it } from "vitest";
import {
  moveChoice,
  recognizeFixture,
  replaceSuggestion,
  type Food,
} from "./mock-recognition";

const recipe: Food = {
  id: "recipe-stock",
  name: "chicken stock",
  kind: "Recipe",
  detail: "Homemade",
};

describe("prototype suggestions", () => {
  it("retains same-name matches across pantry, recipe, and section groups", () => {
    const result = recognizeFixture({ raw: "2 cups chicken st", cursor: 17 });
    expect(result.suggestions.map(({ food }) => [food.id, food.kind])).toEqual([
      ["pantry-stock", "Pantry item"],
      ["recipe-stock", "Recipe"],
      ["section-stock", "Section"],
    ]);
  });

  it("replaces the whole returned name range when the cursor is in the middle, keeping preparation", () => {
    const raw = "1 cup flour, sifted";
    const result = recognizeFixture({ raw, cursor: 8 });
    const suggestion = result.suggestions.find(
      ({ food }) => food.id === "pantry-bread-flour",
    )!;
    expect(replaceSuggestion(raw, suggestion)).toMatchObject({
      raw: "1 cup bread flour, sifted",
      cursor: 17,
      choice: { range: { start: 6, end: 17 } },
    });
  });

  it("uses UTF-16 offsets and preserves text on both sides of a replacement", () => {
    expect(
      replaceSuggestion("🍲 st, hot", {
        food: recipe,
        replacement: "chicken stock",
        target: { start: 3, end: 5 },
      }),
    ).toMatchObject({
      raw: "🍲 chicken stock, hot",
      cursor: 16,
    });
  });

  it.each([
    { start: -1, end: 2 },
    { start: 2, end: 1 },
    { start: 0, end: 8 },
    { start: 0.5, end: 2 },
  ])("rejects an invalid target %o", (target) => {
    expect(() =>
      replaceSuggestion("stock", {
        food: recipe,
        replacement: recipe.name,
        target,
      }),
    ).toThrow("no longer matches");
  });

  it("does not suggest units or ingredients while the caret is in the quantity or preparation", () => {
    expect(
      recognizeFixture({ raw: "2 cups flour, sifted", cursor: 1 }).suggestions,
    ).toEqual([]);
    expect(
      recognizeFixture({ raw: "2 cups flour, sifted", cursor: 18 }).suggestions,
    ).toEqual([]);
    expect(recognizeFixture({ raw: "1 cu", cursor: 4 }).suggestions).toEqual(
      [],
    );
  });

  it("preserves an explicit recipe identity through quantity edits instead of choosing the pantry homonym", () => {
    const before = "2 cups chicken stock";
    const after = "12 cups chicken stock";
    const choice = moveChoice(before, after, {
      food: recipe,
      range: { start: 7, end: 20 },
    });
    expect(choice?.range).toEqual({ start: 8, end: 21 });
    expect(recognizeFixture({ raw: after, cursor: 0, choice }).food?.id).toBe(
      "recipe-stock",
    );
  });

  it("releases explicit identity on an ingredient edit, but retains it when preparation is appended", () => {
    const raw = "chicken stock";
    const choice = { food: recipe, range: { start: 0, end: raw.length } };
    expect(moveChoice(raw, "chicken stocks", choice)).toBeUndefined();
    expect(moveChoice(raw, "chicken broth", choice)).toBeUndefined();
    expect(moveChoice(raw, "chicken stock, hot", choice)).toEqual(choice);
  });

  it("replaces a previously quoted name with plain text while retaining the chosen recipe identity", () => {
    const raw = '2 cups "chicken stock", hot';
    const suggestion = recognizeFixture({ raw, cursor: 12 }).suggestions.find(
      ({ food }) => food.id === "recipe-stock",
    )!;
    const next = replaceSuggestion(raw, suggestion);
    expect(next).toMatchObject({
      raw: "2 cups chicken stock, hot",
      cursor: 20,
    });
    expect(recognizeFixture(next).food?.id).toBe("recipe-stock");
  });
});
