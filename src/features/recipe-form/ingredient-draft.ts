import { RecognizedRangeType } from "@/__generated__/graphql";
import { MORSEL_GROUPS, type MorselChoice } from "@/features/morsel/types";
import { z } from "zod";
import { ingredientRecognitionSchema } from "./ingredient-recognition";

export const ingredientDraftSchema = z.object({
  clientId: z.string().min(1),
  raw: z.string(),
  recognition: ingredientRecognitionSchema.optional(),
  // Saved interpretation stays authoritative until the row is edited.
  persisted: z
    .object({
      raw: z.string(),
      quantity: z.number().nullable(),
      uomId: z.string().nullable(),
      ingredientId: z.string().nullable(),
      preparation: z.string().nullable(),
    })
    .optional(),
  choice: z
    .object({
      food: z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        kind: z.enum(MORSEL_GROUPS),
        detail: z.string().optional(),
      }),
      range: z.object({
        start: z.number().int().nonnegative(),
        end: z.number().int().nonnegative(),
      }),
    })
    .optional(),
});

export type IngredientDraft = z.infer<typeof ingredientDraftSchema>;

export function newIngredientDraft(raw = ""): IngredientDraft {
  return { clientId: crypto.randomUUID(), raw };
}

export function updateIngredient(
  rows: IngredientDraft[],
  clientId: string,
  raw: string,
  choice?: MorselChoice,
): IngredientDraft[] {
  return rows.map((row) =>
    row.clientId === clientId && (row.raw !== raw || row.choice !== choice)
      ? { clientId, raw, ...(choice ? { choice } : {}) }
      : row,
  );
}

/** A chosen name changes one known range; retain parsed quantity/unit outside it for immediate save. */
export function chooseIngredient(
  rows: IngredientDraft[],
  clientId: string,
  raw: string,
  choice: MorselChoice,
): IngredientDraft[] {
  return rows.map((row) => {
    if (row.clientId !== clientId) return row;
    const previous =
      row.recognition?.raw === row.raw ? row.recognition : undefined;
    const delta = raw.length - row.raw.length;
    const oldEnd = choice.range.end - delta;
    const recognition = previous
      ? {
          raw,
          cursor: choice.range.end,
          ranges: [
            ...previous.ranges.flatMap((range) => {
              if (
                range.type === RecognizedRangeType.ITEM ||
                range.type === RecognizedRangeType.NEW_ITEM
              )
                return [];
              if (range.end <= choice.range.start) return [range];
              if (range.start >= oldEnd)
                return [
                  {
                    ...range,
                    start: range.start + delta,
                    end: range.end + delta,
                  },
                ];
              return [];
            }),
            {
              ...choice.range,
              type: RecognizedRangeType.ITEM,
              id: choice.food.id,
              quantity: null,
            },
          ],
        }
      : undefined;
    return { clientId, raw, choice, ...(recognition ? { recognition } : {}) };
  });
}

export function insertIngredient(
  rows: IngredientDraft[],
  index: number,
  row: IngredientDraft,
): IngredientDraft[] {
  return [...rows.slice(0, index), row, ...rows.slice(index)];
}

export function removeIngredient(
  rows: IngredientDraft[],
  clientId: string,
): IngredientDraft[] {
  return rows.filter((row) => row.clientId !== clientId);
}

export function moveIngredient(
  rows: IngredientDraft[],
  clientId: string,
  direction: -1 | 1,
): IngredientDraft[] {
  const index = rows.findIndex((row) => row.clientId === clientId);
  const destination = index + direction;
  if (index < 0 || destination < 0 || destination >= rows.length) {
    return rows;
  }
  const result = [...rows];
  [result[index], result[destination]] = [result[destination], result[index]];
  return result;
}

// Preserve text outside the selection just as an ordinary paste would.
export function pasteIngredientLines(
  raw: string,
  text: string,
  selectionStart: number,
  selectionEnd: number,
): string[] {
  return (raw.slice(0, selectionStart) + text + raw.slice(selectionEnd))
    .split(/\r\n|\r|\n/)
    .filter((line) => line.trim().length > 0);
}
