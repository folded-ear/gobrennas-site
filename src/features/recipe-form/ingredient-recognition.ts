import {
  RecognitionKind,
  RecognizedRangeType,
  type IngredientRefInfo,
} from "@/__generated__/graphql";
import type {
  MorselChoice,
  MorselRecognition,
  MorselSuggestion,
} from "@/features/morsel/types";
import { z } from "zod";

export const ingredientRecognitionSchema = z
  .object({
    raw: z.string(),
    cursor: z.number().int().nonnegative(),
    suggestions: z
      .array(
        z.object({
          name: z.string().min(1),
          kind: z.enum(RecognitionKind),
          detail: z.string().nullable(),
          target: z.object({
            start: z.number().int().nonnegative(),
            end: z.number().int().nonnegative(),
            type: z.literal(RecognizedRangeType.ITEM),
            id: z.string().min(1),
          }),
        }),
      )
      .optional(),
    ranges: z.array(
      z.object({
        start: z.number().int().nonnegative(),
        end: z.number().int().nonnegative(),
        type: z.enum(RecognizedRangeType),
        quantity: z.number().nonnegative().nullable(),
        id: z.string().min(1).nullable(),
      }),
    ),
  })
  .superRefine((result, context) => {
    if (
      result.cursor > result.raw.length ||
      result.suggestions?.some(
        ({ target }) =>
          target.start > target.end || target.end > result.raw.length,
      ) ||
      result.ranges.some(
        (range) =>
          range.start >= range.end ||
          range.end > result.raw.length ||
          (range.type === RecognizedRangeType.QUANTITY &&
            range.quantity === null) ||
          ((range.type === RecognizedRangeType.UNIT ||
            range.type === RecognizedRangeType.ITEM) &&
            range.id === null),
      )
    ) {
      context.addIssue({
        code: "custom",
        message: "Invalid ingredient recognition ranges.",
      });
    }
  });

export type IngredientRecognition = z.infer<typeof ingredientRecognitionSchema>;

/** Shared highlight ranges for editable and resting ingredient text. */
export function toMorselRecognition(
  result: IngredientRecognition,
): MorselRecognition {
  const ranges: MorselRecognition["ranges"] = result.ranges.flatMap((range) => {
    const type =
      range.type === RecognizedRangeType.QUANTITY
        ? "quantity"
        : range.type === RecognizedRangeType.UNIT ||
            range.type === RecognizedRangeType.NEW_UNIT
          ? "unit"
          : range.type === RecognizedRangeType.ITEM ||
              range.type === RecognizedRangeType.NEW_ITEM
            ? "ingredient"
            : undefined;
    return type ? [{ start: range.start, end: range.end, type }] : [];
  });
  return { raw: result.raw, ranges };
}
export type RecognizeIngredient = (
  raw: string,
  cursor: number,
  signal: AbortSignal,
  options?: { choice?: MorselChoice; suggest: boolean },
) => Promise<IngredientRecognition>;

export function toMorselSuggestions(
  result: IngredientRecognition,
): MorselSuggestion[] {
  return (result.suggestions ?? []).map(({ name, kind, detail, target }) => ({
    food: {
      id: target.id,
      name,
      kind:
        kind === RecognitionKind.PANTRY_ITEM
          ? "Pantry item"
          : kind === RecognitionKind.RECIPE
            ? "Recipe"
            : "Section",
      ...(detail ? { detail } : {}),
    },
    replacement: name,
    target: { start: target.start, end: target.end },
  }));
}

/** Keep the source text intact; strip paired markers only from parsed names. */
function stripMarkers(text: string): string {
  if (text.length < 3) return text;
  const first = text[0];
  const last = first === "“" ? "”" : first === "«" ? "»" : first;
  return !/[a-z0-9]/i.test(first) && text.endsWith(last)
    ? text.slice(1, -1)
    : text;
}

export function recognizedParts(result: IngredientRecognition) {
  const quantity = result.ranges.find(
    (range) => range.type === RecognizedRangeType.QUANTITY,
  );
  const unit = result.ranges.find(
    (range) =>
      range.type === RecognizedRangeType.UNIT ||
      range.type === RecognizedRangeType.NEW_UNIT,
  );
  const ingredient = result.ranges.find(
    (range) =>
      range.type === RecognizedRangeType.ITEM ||
      range.type === RecognizedRangeType.NEW_ITEM,
  );
  const preparation = [quantity, unit, ingredient]
    .filter((range) => range !== undefined)
    .sort((a, b) => b.start - a.start)
    .reduce(
      (text, range) => text.slice(0, range.start) + text.slice(range.end),
      result.raw,
    )
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s*(,\s*)+/g, ", ")
    .replace(/^,\s*/, "");
  return { quantity, unit, ingredient, preparation };
}

export function toIngredientRefInfo(row: {
  raw: string;
  persisted?: {
    raw: string;
    quantity: number | null;
    uomId: string | null;
    ingredientId: string | null;
    preparation: string | null;
  };
  recognition?: IngredientRecognition;
  choice?: MorselChoice;
}): IngredientRefInfo {
  if (row.persisted?.raw === row.raw) return { ...row.persisted };
  const result = row.recognition;
  const choice = row.choice;
  const selected =
    choice &&
    row.raw.slice(choice.range.start, choice.range.end) === choice.food.name
      ? {
          ingredientId: choice.food.id,
        }
      : undefined;
  if (!result || result.raw !== row.raw) return { raw: row.raw, ...selected };
  const { quantity, unit, ingredient, preparation } = recognizedParts(result);
  const unitInfo = !unit
    ? {}
    : unit.type === RecognizedRangeType.UNIT
      ? { uomId: unit.id }
      : { units: stripMarkers(row.raw.slice(unit.start, unit.end)) };
  const ingredientInfo = !ingredient
    ? {}
    : ingredient.type === RecognizedRangeType.ITEM
      ? { ingredientId: ingredient.id }
      : {
          ingredient: stripMarkers(
            row.raw.slice(ingredient.start, ingredient.end),
          ),
        };
  return {
    raw: row.raw,
    // The API stores units on a quantity; its own auto-recognition defaults to one.
    ...(quantity || unit ? { quantity: quantity?.quantity ?? 1 } : {}),
    ...unitInfo,
    ...(selected ?? ingredientInfo),
    ...(preparation ? { preparation } : {}),
  };
}
