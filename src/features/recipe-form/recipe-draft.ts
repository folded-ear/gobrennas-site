import type { IngredientInfo } from "@/__generated__/graphql";
import { normalizeLabels } from "@/features/label-editor/labels";
import { z } from "zod";
import { ingredientDraftSchema, newIngredientDraft } from "./ingredient-draft";
import { toIngredientRefInfo } from "./ingredient-recognition";
import { sectionDraftSchema } from "./section-draft";

const GRAPHQL_INT_MAX = 2_147_483_647;
const MAX_TOTAL_TIME_MINUTES = 35_791;

export const recipeDraftSchema = z.object({
  title: z
    .string()
    .refine((value) => value.trim().length > 0, "A recipe title is required."),
  sourceUrl: z.string(),
  yieldServings: optionalNumber(
    parseInteger,
    1,
    GRAPHQL_INT_MAX,
    "Enter a whole number of servings greater than 0.",
  ),
  totalTimeText: optionalNumber(
    parseDuration,
    0,
    MAX_TOTAL_TIME_MINUTES,
    "Enter a time in minutes or hours and minutes, like 80 min or 1 hr 20 min.",
  ),
  caloriesPerServing: optionalNumber(
    parseInteger,
    0,
    GRAPHQL_INT_MAX,
    "Enter calories as a whole number of 0 or more.",
  ),
  directions: z.string(),
  labels: z.array(z.string()).transform(normalizeLabels),
  ingredients: z.array(ingredientDraftSchema),
  sections: z.array(sectionDraftSchema),
});

export type RecipeDraft = z.input<typeof recipeDraftSchema>;

export function newRecipeDraft(): RecipeDraft {
  return {
    title: "",
    sourceUrl: "",
    yieldServings: "",
    totalTimeText: "",
    caloriesPerServing: "",
    directions: "",
    labels: [],
    ingredients: [newIngredientDraft()],
    sections: [],
  };
}

export function toIngredientInfo(draft: RecipeDraft): IngredientInfo {
  const values = recipeDraftSchema.parse(draft);
  return {
    type: "Recipe",
    name: values.title.trim(),
    externalUrl: values.sourceUrl.trim() || null,
    yield: values.yieldServings,
    totalTime:
      values.totalTimeText === null ? null : values.totalTimeText * 60_000,
    calories: values.caloriesPerServing,
    directions: values.directions,
    labels: values.labels,
    ingredients: values.ingredients
      .filter((row) => row.raw.trim().length > 0)
      .map(toIngredientRefInfo),
    sections: values.sections.map((section) => ({
      id: section.id ?? null,
      name: section.title.trim(),
      directions: section.directions,
      ingredients: section.ingredients
        .filter((row) => row.raw.trim().length > 0)
        .map(toIngredientRefInfo),
    })),
  };
}

function optionalNumber(
  parse: (text: string) => number,
  minimum: number,
  maximum: number,
  message: string,
) {
  return z
    .string()
    .trim()
    .transform((text) => (text === "" ? null : parse(text)))
    .refine(
      (value) =>
        value === null ||
        (Number.isSafeInteger(value) && value >= minimum && value <= maximum),
      message,
    );
}

function parseInteger(text: string): number {
  return /^\d+$/.test(text) ? Number(text) : NaN;
}

function parseDuration(text: string): number {
  if (/^\d+$/.test(text)) {
    return Number(text);
  }
  const match =
    /^(?:(\d+)\s*(?:h|hrs?|hours?)(?:\s*,?\s*(\d+)\s*(?:m|mins?|minutes?))?|(\d+)\s*(?:m|mins?|minutes?))$/i.exec(
      text,
    );
  return match === null
    ? NaN
    : Number(match[1] ?? 0) * 60 + Number(match[2] ?? match[3] ?? 0);
}
