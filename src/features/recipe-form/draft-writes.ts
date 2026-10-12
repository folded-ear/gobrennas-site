import { newIngredientDraft, type IngredientDraft } from "./ingredient-draft";

/** What sets added directions apart from those already there. */
const PARAGRAPH_BREAK = "\n\n";

/**
 * I add an ingredient row for each nonblank line, trimmed. A last row
 * holding only whitespace takes the first line, keeping its place; every
 * other line gets a row at the end. I give the rows, and which of them the
 * lines arrived in.
 */
export function appendIngredientLines(
  rows: IngredientDraft[],
  lines: readonly string[],
): { rows: IngredientDraft[]; arrived: IngredientDraft[] } {
  const texts = lines.map((it) => it.trim()).filter((it) => it.length > 0);
  if (texts.length === 0) return { rows, arrived: [] };
  const last = rows.at(-1);
  const blank = last !== undefined && last.raw.trim() === "" ? last : undefined;
  const arrived = texts.map((raw, i) =>
    blank !== undefined && i === 0
      ? { clientId: blank.clientId, raw }
      : newIngredientDraft(raw),
  );
  return {
    rows: [...(blank === undefined ? rows : rows.slice(0, -1)), ...arrived],
    arrived,
  };
}

/** I add text to directions as a paragraph of its own. */
export function appendDirectionsText(directions: string, text: string): string {
  if (text.trim() === "") return directions;
  return (directions + PARAGRAPH_BREAK + text).trim();
}
