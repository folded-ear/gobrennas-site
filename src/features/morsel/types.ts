export type TextRange = { start: number; end: number };
export const MORSEL_GROUPS = ["Pantry item", "Recipe", "Section"] as const;
export type MorselKind = (typeof MORSEL_GROUPS)[number];

export type MorselFood = {
  id: string;
  name: string;
  kind: MorselKind;
  detail?: string;
};
export type MorselChoice = { food: MorselFood; range: TextRange };
export type MorselSuggestion = {
  food: MorselFood;
  replacement: string;
  target: TextRange;
};
export type MorselRecognition = {
  raw: string;
  ranges: (TextRange &
    (
      { type: "quantity"; quantity: number } | { type: "unit" | "ingredient" }
    ))[];
};
export type MorselSuggestions = {
  raw: string;
  cursor: number;
  options: MorselSuggestion[];
};

export function replaceSuggestion(raw: string, suggestion: MorselSuggestion) {
  const { start, end } = suggestion.target;
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    end < start ||
    end > raw.length
  ) {
    throw new Error("The suggestion no longer matches this text.");
  }
  const cursor = start + suggestion.replacement.length;
  return {
    raw: raw.slice(0, start) + suggestion.replacement + raw.slice(end),
    cursor,
    choice: { food: suggestion.food, range: { start, end: cursor } },
  };
}
