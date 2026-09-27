import { z } from "zod";

export const ingredientDraftSchema = z.object({
  clientId: z.string().min(1),
  raw: z.string(),
});

export type IngredientDraft = z.infer<typeof ingredientDraftSchema>;

export function newIngredientDraft(raw = ""): IngredientDraft {
  return { clientId: crypto.randomUUID(), raw };
}

export function updateIngredient(
  rows: IngredientDraft[],
  clientId: string,
  raw: string,
): IngredientDraft[] {
  return rows.map((row) => (row.clientId === clientId ? { ...row, raw } : row));
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
