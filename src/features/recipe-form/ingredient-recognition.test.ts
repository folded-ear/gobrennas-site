import { RecognizedRangeType as Type } from "@/__generated__/graphql";
import { describe, expect, it } from "vitest";
import { updateIngredient } from "./ingredient-draft";
import {
  ingredientRecognitionSchema,
  recognizedParts,
  toIngredientRefInfo,
  type IngredientRecognition,
} from "./ingredient-recognition";
import { newRecipeDraft, toIngredientInfo } from "./recipe-draft";

const flour: IngredientRecognition = {
  raw: "2 cups flour, sifted",
  cursor: 20,
  ranges: [
    { start: 0, end: 1, type: Type.QUANTITY, quantity: 2, id: null },
    { start: 2, end: 6, type: Type.UNIT, quantity: null, id: "unit-cup" },
    { start: 7, end: 12, type: Type.ITEM, quantity: null, id: "pantry-flour" },
  ],
};

describe("ingredient recognition", () => {
  it("keeps an explicit unit without a number by using the API's default quantity of one", () => {
    const raw = '_pinch_ "salt"';
    const recognition: IngredientRecognition = {
      raw,
      cursor: raw.length,
      ranges: [
        { start: 0, end: 7, type: Type.NEW_UNIT, quantity: null, id: null },
        { start: 8, end: 14, type: Type.NEW_ITEM, quantity: null, id: null },
      ],
    };
    expect(toIngredientRefInfo({ raw, recognition })).toEqual({
      raw,
      quantity: 1,
      units: "pinch",
      ingredient: "salt",
    });
  });
  it("serializes existing ids and quantity, and derives preparation without altering raw text", () => {
    const result = { ...flour, cursor: flour.raw.length };
    const draft = {
      ...newRecipeDraft(),
      title: "Bread",
      ingredients: [
        { clientId: "flour", raw: result.raw, recognition: result },
      ],
    };
    expect(toIngredientInfo(draft).ingredients).toEqual([
      {
        raw: "2 cups flour, sifted",
        quantity: 2,
        uomId: "unit-cup",
        ingredientId: "pantry-flour",
        preparation: "sifted",
      },
    ]);
    expect(draft.ingredients[0].recognition).toEqual(result);
  });

  it.each(['"chocolate chips"', "“chocolate chips”", "«chocolate chips»"])(
    "strips paired markers from new names while retaining %s in raw text",
    (name) => {
      const raw = `2 _cups_ ${name}, melted`;
      const recognition: IngredientRecognition = {
        raw,
        cursor: raw.length,
        ranges: [
          { start: 0, end: 1, type: Type.QUANTITY, quantity: 2, id: null },
          { start: 2, end: 8, type: Type.NEW_UNIT, quantity: null, id: null },
          { start: 9, end: 26, type: Type.NEW_ITEM, quantity: null, id: null },
        ],
      };
      expect(toIngredientRefInfo({ raw, recognition })).toEqual({
        raw,
        quantity: 2,
        units: "cups",
        ingredient: "chocolate chips",
        preparation: "melted",
      });
    },
  );

  it("keeps fractions as entered and uses the server's numeric quantity, including zero", () => {
    for (const [raw, quantity] of [
      ["½ cup flour", 0.5],
      ["0 cup flour", 0],
    ] as const) {
      const recognition = {
        ...flour,
        raw,
        cursor: raw.length,
        ranges: [
          { start: 0, end: 1, type: Type.QUANTITY, quantity, id: null },
          { start: 2, end: 5, type: Type.UNIT, quantity: null, id: "unit-cup" },
          {
            start: 6,
            end: 11,
            type: Type.ITEM,
            quantity: null,
            id: "pantry-flour",
          },
        ],
      };
      expect(toIngredientRefInfo({ raw, recognition })).toEqual({
        raw,
        quantity,
        uomId: "unit-cup",
        ingredientId: "pantry-flour",
      });
    }
  });

  it("preserves incomplete markers and unrecognized text instead of guessing new names", () => {
    for (const raw of [
      '2 _cups "chocolate',
      "“chocolate",
      "«chocolate",
      "!cookies",
    ]) {
      expect(
        toIngredientRefInfo({
          raw,
          recognition: { raw, cursor: raw.length, ranges: [] },
        }),
      ).toEqual({ raw, preparation: raw });
    }
  });

  it("drops parsed data on an edit and refuses stale parsed data during serialization", () => {
    const row = { clientId: "flour", raw: flour.raw, recognition: flour };
    expect(updateIngredient([row], "flour", "salt")).toEqual([
      { clientId: "flour", raw: "salt" },
    ]);
    expect(toIngredientRefInfo({ ...row, raw: "salt" })).toEqual({
      raw: "salt",
    });
    expect(updateIngredient([row], "flour", row.raw)).toEqual([row]);
  });

  it("normalizes only the preparation remainder, removing ranges from right to left", () => {
    expect(
      recognizedParts({ ...flour, raw: "2 cups flour, ,  sifted   twice" })
        .preparation,
    ).toBe("sifted twice");
  });

  it.each([
    { start: -1 },
    { end: 200 },
    { start: 1, end: 1 },
    { quantity: null },
    { quantity: -1 },
    { type: Type.ITEM, id: null },
    { type: Type.UNIT, id: "" },
  ])("rejects malformed recognition ranges (%j)", (override) => {
    expect(
      ingredientRecognitionSchema.safeParse({
        ...flour,
        cursor: 0,
        ranges: [{ ...flour.ranges[0], ...override }],
      }).success,
    ).toBe(false);
  });
});
