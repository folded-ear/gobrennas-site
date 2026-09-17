import { describe, expect, it } from "vitest";
import {
  newRecipeDraft,
  toIngredientInfo,
  validateRecipeDraft,
  type RecipeDraft,
} from "./recipe-draft";

function recipeDraft(overrides: Partial<RecipeDraft> = {}): RecipeDraft {
  return {
    title: "Cider-braised chicken",
    sourceUrl: "",
    yieldServings: "",
    totalTimeText: "",
    caloriesPerServing: "",
    directions: "Brown the chicken first.",
    ...overrides,
  };
}

describe("newRecipeDraft", () => {
  it("starts each distinct draft with six blank editable fields", () => {
    const firstDraft = newRecipeDraft();
    const secondDraft = newRecipeDraft();

    expect(firstDraft).toStrictEqual({
      title: "",
      sourceUrl: "",
      yieldServings: "",
      totalTimeText: "",
      caloriesPerServing: "",
      directions: "",
    });
    expect(secondDraft).toStrictEqual({
      title: "",
      sourceUrl: "",
      yieldServings: "",
      totalTimeText: "",
      caloriesPerServing: "",
      directions: "",
    });
    expect(firstDraft).not.toBe(secondDraft);
  });
});

describe("validateRecipeDraft", () => {
  it.each(["", "   ", "\t\n "])(
    "requires a title when it contains only whitespace (%j)",
    (title) => {
      expect(validateRecipeDraft(recipeDraft({ title }))).toStrictEqual({
        title: "A recipe title is required.",
      });
    },
  );

  it("accepts a title with visible text and blank optional metadata", () => {
    expect(validateRecipeDraft(recipeDraft())).toStrictEqual({});
  });

  it("collects every invalid field error in one pass", () => {
    expect(
      validateRecipeDraft(
        recipeDraft({
          title: " ",
          yieldServings: "0",
          totalTimeText: "1:20",
          caloriesPerServing: "-1",
        }),
      ),
    ).toStrictEqual({
      title: "A recipe title is required.",
      yieldServings: "Enter a whole number of servings greater than 0.",
      totalTimeText:
        "Enter a time in minutes or hours and minutes, like 80 min or 1 hr 20 min.",
      caloriesPerServing: "Enter calories as a whole number of 0 or more.",
    });
  });

  describe("yield", () => {
    it.each([
      { input: "1", description: "the smallest positive whole number" },
      { input: "  12  ", description: "a trimmed whole number" },
      { input: "2147483647", description: "the GraphQL Int maximum" },
    ])("accepts $description ($input)", ({ input }) => {
      expect(
        validateRecipeDraft(recipeDraft({ yieldServings: input })),
      ).toStrictEqual({});
    });

    it.each([
      { input: "0", description: "zero" },
      { input: "-1", description: "a negative whole number" },
      { input: "1.5", description: "a decimal" },
      { input: "1e2", description: "exponent notation" },
      { input: "two", description: "text" },
      { input: "2147483648", description: "a value above GraphQL Int" },
    ])("rejects $description ($input)", ({ input }) => {
      expect(
        validateRecipeDraft(recipeDraft({ yieldServings: input })),
      ).toStrictEqual({
        yieldServings: "Enter a whole number of servings greater than 0.",
      });
    });
  });

  describe("calories per serving", () => {
    it.each([
      { input: "0", description: "zero" },
      { input: "  460  ", description: "a trimmed whole number" },
      { input: "2147483647", description: "the GraphQL Int maximum" },
    ])("accepts $description ($input)", ({ input }) => {
      expect(
        validateRecipeDraft(recipeDraft({ caloriesPerServing: input })),
      ).toStrictEqual({});
    });

    it.each([
      { input: "-1", description: "a negative whole number" },
      { input: "460.5", description: "a decimal" },
      { input: "4e2", description: "exponent notation" },
      { input: "many", description: "text" },
      { input: "2147483648", description: "a value above GraphQL Int" },
    ])("rejects $description ($input)", ({ input }) => {
      expect(
        validateRecipeDraft(recipeDraft({ caloriesPerServing: input })),
      ).toStrictEqual({
        caloriesPerServing: "Enter calories as a whole number of 0 or more.",
      });
    });
  });

  describe("total cook time", () => {
    it.each([
      { input: "80", minutes: 80, description: "bare whole minutes" },
      { input: "80 m", minutes: 80, description: "compact minute units" },
      { input: "80 min", minutes: 80, description: "minute units" },
      { input: "80 minute", minutes: 80, description: "singular minute units" },
      {
        input: "1h 20m",
        minutes: 80,
        description: "compact hour and minute units",
      },
      {
        input: "1 hr 20 min",
        minutes: 80,
        description: "abbreviated hour and minute units",
      },
      {
        input: "1 hour, 20 minutes",
        minutes: 80,
        description: "word units separated by a comma",
      },
      {
        input: "  1 HOUR , 20 MINUTES  ",
        minutes: 80,
        description: "case, surrounding spaces, and a spaced comma",
      },
      { input: "2 hours", minutes: 120, description: "hours without minutes" },
      { input: "0", minutes: 0, description: "zero bare minutes" },
      { input: "0 minutes", minutes: 0, description: "zero minute units" },
      {
        input: "35791 min",
        minutes: 35791,
        description:
          "the largest minute value whose milliseconds fit GraphQL Int",
      },
    ])("accepts $description ($input)", ({ input, minutes }) => {
      const draft = recipeDraft({ totalTimeText: input });

      expect(validateRecipeDraft(draft)).toStrictEqual({});
      expect(toIngredientInfo(draft).totalTime).toBe(minutes * 60_000);
    });

    it.each([
      { input: "1.5 min", description: "a decimal" },
      { input: "-1 min", description: "a negative duration" },
      { input: "1h 20s", description: "seconds" },
      { input: "1h 20m 5m", description: "duplicate units" },
      { input: "1:20", description: "clock syntax" },
      { input: "about an hour", description: "unrecognized text" },
      {
        input: "35792 min",
        description: "minutes whose milliseconds exceed GraphQL Int",
      },
    ])("rejects $description ($input)", ({ input }) => {
      expect(
        validateRecipeDraft(recipeDraft({ totalTimeText: input })),
      ).toStrictEqual({
        totalTimeText:
          "Enter a time in minutes or hours and minutes, like 80 min or 1 hr 20 min.",
      });
    });
  });

  it("does not validate malformed source URL text", () => {
    expect(
      validateRecipeDraft(recipeDraft({ sourceUrl: "not a URL" })),
    ).toStrictEqual({});
  });
});

describe("toIngredientInfo", () => {
  it("serializes populated metadata under the API keys and preserves directions exactly", () => {
    expect(
      toIngredientInfo(
        recipeDraft({
          title: "  Cider-braised chicken  ",
          sourceUrl: "  https://recipes.example.test/cider-chicken  ",
          yieldServings: "6",
          totalTimeText: "1 hour, 20 minutes",
          caloriesPerServing: "460",
          directions: "Brown the chicken.\n\nFinish with cider.  ",
        }),
      ),
    ).toStrictEqual({
      type: "Recipe",
      name: "Cider-braised chicken",
      externalUrl: "https://recipes.example.test/cider-chicken",
      yield: 6,
      totalTime: 4_800_000,
      calories: 460,
      directions: "Brown the chicken.\n\nFinish with cider.  ",
    });
  });

  it("serializes every blank optional metadata value explicitly as null", () => {
    expect(toIngredientInfo(recipeDraft())).toStrictEqual({
      type: "Recipe",
      name: "Cider-braised chicken",
      externalUrl: null,
      yield: null,
      totalTime: null,
      calories: null,
      directions: "Brown the chicken first.",
    });
  });

  it("serializes whitespace-only optional metadata values explicitly as null", () => {
    expect(
      toIngredientInfo(
        recipeDraft({
          sourceUrl: " \t ",
          yieldServings: " \n ",
          totalTimeText: "  ",
          caloriesPerServing: "\t ",
        }),
      ),
    ).toStrictEqual({
      type: "Recipe",
      name: "Cider-braised chicken",
      externalUrl: null,
      yield: null,
      totalTime: null,
      calories: null,
      directions: "Brown the chicken first.",
    });
  });

  it("serializes a valid calorie zero rather than null", () => {
    expect(
      toIngredientInfo(recipeDraft({ caloriesPerServing: "0" })),
    ).toStrictEqual({
      type: "Recipe",
      name: "Cider-braised chicken",
      externalUrl: null,
      yield: null,
      totalTime: null,
      calories: 0,
      directions: "Brown the chicken first.",
    });
  });

  it("trims malformed source URL text when serializing it", () => {
    expect(
      toIngredientInfo(recipeDraft({ sourceUrl: "  not a URL  " })),
    ).toStrictEqual({
      type: "Recipe",
      name: "Cider-braised chicken",
      externalUrl: "not a URL",
      yield: null,
      totalTime: null,
      calories: null,
      directions: "Brown the chicken first.",
    });
  });
});
