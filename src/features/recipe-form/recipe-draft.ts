import type { IngredientInfo } from "@/__generated__/graphql";

export type RecipeDraft = {
  title: string;
  sourceUrl: string;
  yieldServings: string;
  totalTimeText: string;
  caloriesPerServing: string;
  directions: string;
};

export type RecipeDraftErrors = {
  title?: string;
  yieldServings?: string;
  totalTimeText?: string;
  caloriesPerServing?: string;
};

const GRAPHQL_INT_MAX = 2_147_483_647;
const MAX_TOTAL_TIME_MINUTES = 35_791;

type ParseResult = { valid: true; value: number | null } | { valid: false };

export function newRecipeDraft(): RecipeDraft {
  return {
    title: "",
    sourceUrl: "",
    yieldServings: "",
    totalTimeText: "",
    caloriesPerServing: "",
    directions: "",
  };
}

export function validateRecipeDraft(draft: RecipeDraft): RecipeDraftErrors {
  const errors: RecipeDraftErrors = {};

  if (draft.title.trim().length === 0) {
    errors.title = "A recipe title is required.";
  }

  if (!parseOptionalInteger(draft.yieldServings, 1).valid) {
    errors.yieldServings = "Enter a whole number of servings greater than 0.";
  }

  if (!parseOptionalDuration(draft.totalTimeText).valid) {
    errors.totalTimeText =
      "Enter a time in minutes or hours and minutes, like 80 min or 1 hr 20 min.";
  }

  if (!parseOptionalInteger(draft.caloriesPerServing, 0).valid) {
    errors.caloriesPerServing =
      "Enter calories as a whole number of 0 or more.";
  }

  return errors;
}

export function toIngredientInfo(draft: RecipeDraft): IngredientInfo {
  const yieldServings = parseOptionalInteger(draft.yieldServings, 1);
  const totalTime = parseOptionalDuration(draft.totalTimeText);
  const caloriesPerServing = parseOptionalInteger(draft.caloriesPerServing, 0);

  if (
    draft.title.trim().length === 0 ||
    !yieldServings.valid ||
    !totalTime.valid ||
    !caloriesPerServing.valid
  ) {
    throw new Error("Cannot serialize an invalid recipe draft.");
  }

  return {
    type: "Recipe",
    name: draft.title.trim(),
    externalUrl: draft.sourceUrl.trim() || null,
    yield: yieldServings.value,
    totalTime: totalTime.value === null ? null : totalTime.value * 60_000,
    calories: caloriesPerServing.value,
    directions: draft.directions,
  };
}

function parseOptionalInteger(input: string, minimum: number): ParseResult {
  const trimmedInput = input.trim();

  if (trimmedInput.length === 0) {
    return { valid: true, value: null };
  }

  if (!/^\d+$/.test(trimmedInput)) {
    return { valid: false };
  }

  const value = Number(trimmedInput);

  if (
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > GRAPHQL_INT_MAX
  ) {
    return { valid: false };
  }

  return { valid: true, value };
}

function parseOptionalDuration(input: string): ParseResult {
  const trimmedInput = input.trim();

  if (trimmedInput.length === 0) {
    return { valid: true, value: null };
  }

  const bareMinutesMatch = /^(\d+)$/.exec(trimmedInput);
  if (bareMinutesMatch !== null) {
    return parseTotalMinutes(Number(bareMinutesMatch[1]));
  }

  const durationMatch =
    /^(?:(\d+)\s*(?:h|hrs?|hours?)(?:\s*,?\s*(\d+)\s*(?:m|mins?|minutes?))?|(\d+)\s*(?:m|mins?|minutes?))$/i.exec(
      trimmedInput,
    );

  if (durationMatch === null) {
    return { valid: false };
  }

  const hours = durationMatch[1] === undefined ? 0 : Number(durationMatch[1]);
  const minutes = Number(durationMatch[2] ?? durationMatch[3] ?? 0);

  return parseTotalMinutes(hours * 60 + minutes);
}

function parseTotalMinutes(value: number): ParseResult {
  if (!Number.isSafeInteger(value) || value > MAX_TOTAL_TIME_MINUTES) {
    return { valid: false };
  }

  return { valid: true, value };
}
