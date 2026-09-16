import { describe, expect, it } from "vitest";
import {
  newRecipeDraft,
  toIngredientInfo,
  validateRecipeDraft,
} from "./recipe-draft";

describe("newRecipeDraft", () => {
  it("starts each distinct draft with blank editable fields", () => {
    const firstDraft = newRecipeDraft();
    const secondDraft = newRecipeDraft();

    expect(firstDraft).toStrictEqual({ title: "", directions: "" });
    expect(secondDraft).toStrictEqual({ title: "", directions: "" });
    expect(firstDraft).not.toBe(secondDraft);
  });
});

describe("validateRecipeDraft", () => {
  it.each(["", "   ", "\t\n "])(
    "requires a title when it contains only whitespace (%j)",
    (title) => {
      expect(validateRecipeDraft({ title, directions: "" })).toStrictEqual({
        title: "A recipe title is required.",
      });
    },
  );

  it("accepts a title with visible text", () => {
    expect(
      validateRecipeDraft({
        title: "Cider-braised chicken",
        directions: "Brown the chicken first.",
      }),
    ).toStrictEqual({});
  });
});

describe("toIngredientInfo", () => {
  it("trims only the title and preserves directions exactly", () => {
    expect(
      toIngredientInfo({
        title: "  Cider-braised chicken  ",
        directions: "Brown the chicken.\n\nFinish with cider.  ",
      }),
    ).toStrictEqual({
      type: "Recipe",
      name: "Cider-braised chicken",
      directions: "Brown the chicken.\n\nFinish with cider.  ",
    });
  });
});
