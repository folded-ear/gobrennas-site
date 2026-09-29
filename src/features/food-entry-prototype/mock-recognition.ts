// A proposed UI contract, not the current GraphQL schema. All data is fictional.
import type {
  MorselChoice,
  MorselFood,
  MorselKind,
  TextRange,
} from "@/features/morsel-input/types";
export { moveChoice } from "@/features/morsel-input/choice-history";
export { replaceSuggestion } from "@/features/morsel-input/types";
export type { TextRange } from "@/features/morsel-input/types";
export type FoodKind = MorselKind;
export type Food = MorselFood;
export type Choice = MorselChoice;
export type RecognitionRequest = {
  raw: string;
  cursor: number;
  choice?: Choice;
};
export type Suggestion = { food: Food; replacement: string; target: TextRange };
export type RecognitionResponse = {
  raw: string;
  cursor: number;
  ranges: (TextRange & { type: "quantity" | "unit" | "ingredient" })[];
  food?: Food;
  suggestions: Suggestion[];
};

export const FOOD_KINDS: FoodKind[] = ["Pantry item", "Recipe", "Section"];
const FOODS: Food[] = [
  {
    id: "pantry-flour",
    name: "flour",
    kind: "Pantry item",
    detail: "All-purpose flour",
  },
  {
    id: "pantry-bread-flour",
    name: "bread flour",
    kind: "Pantry item",
    detail: "Baking",
  },
  {
    id: "pantry-almond-flour",
    name: "almond flour",
    kind: "Pantry item",
    detail: "Baking",
  },
  { id: "pantry-butter", name: "butter", kind: "Pantry item", detail: "Dairy" },
  {
    id: "pantry-stock",
    name: "chicken stock",
    kind: "Pantry item",
    detail: "Store-bought",
  },
  {
    id: "pantry-tomato",
    name: "tomatoes",
    kind: "Pantry item",
    detail: "Produce",
  },
  {
    id: "recipe-stock",
    name: "chicken stock",
    kind: "Recipe",
    detail: "Your homemade stock · 2 hours",
  },
  {
    id: "recipe-flatbread",
    name: "flour tortillas",
    kind: "Recipe",
    detail: "Makes 8 · 30 minutes",
  },
  {
    id: "recipe-butter",
    name: "garlic butter",
    kind: "Recipe",
    detail: "10 minutes",
  },
  {
    id: "section-stock",
    name: "chicken stock",
    kind: "Section",
    detail: "From Sunday chicken soup",
  },
  {
    id: "section-flour",
    name: "flour coating",
    kind: "Section",
    detail: "From crispy chicken",
  },
  {
    id: "section-butter",
    name: "butter filling",
    kind: "Section",
    detail: "From cinnamon rolls",
  },
];

/** Deliberately limited fixture parser. The production server owns recognition. */
export function recognizeFixture(
  request: RecognitionRequest,
): RecognitionResponse {
  const { raw, cursor, choice } = request;
  const ranges: RecognitionResponse["ranges"] = [];
  const quantity = /^\s*(\d+(?:\s+\d+\/\d+|\/\d+|\.\d+)?|[¼½¾])(?=\s|$)/.exec(
    raw,
  );
  let start = 0;
  if (quantity) {
    start = quantity[0].length;
    ranges.push({
      start: raw.indexOf(quantity[1]),
      end: start,
      type: "quantity",
    });
  }
  const unit =
    /^\s*(_[^_]+_|cups?|tbsp|tsp|teaspoons?|tablespoons?|grams?|kg|g|oz|pounds?|lb|cloves?)(?=\s|$)/i.exec(
      raw.slice(start),
    );
  if (unit) {
    ranges.push({
      start: start + unit[0].indexOf(unit[1]),
      end: start + unit[0].length,
      type: "unit",
    });
    start += unit[0].length;
  }
  start += /^\s*/.exec(raw.slice(start))![0].length;
  const comma = raw.indexOf(",", start);
  const end =
    (comma < 0 ? raw.length : comma) -
    (/\s*$/.exec(raw.slice(start, comma < 0 ? raw.length : comma))?.[0]
      .length ?? 0);
  const name = raw.slice(start, end).replace(/^["“«]|["”»]$/g, "");
  const food =
    choice && choice.range.start === start && choice.range.end === end
      ? choice.food
      : FOODS.find((item) => item.name.toLowerCase() === name.toLowerCase());
  if (food) ranges.push({ start, end, type: "ingredient" });
  const query = raw
    .slice(start, Math.min(cursor, end))
    .replace(/^["“«]|["”»]$/g, "")
    .toLowerCase();
  const suggestions =
    cursor >= start && cursor <= end && query.length > 0
      ? FOODS.filter((item) => item.name.toLowerCase().includes(query)).map(
          (food) => ({
            food,
            replacement: food.name,
            target: { start, end },
          }),
        )
      : [];
  return { raw, cursor, ranges, food, suggestions };
}

export function mockRecognize(
  request: RecognitionRequest,
  signal: AbortSignal,
  delay: number,
  fail: boolean,
): Promise<RecognitionResponse> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      if (fail)
        reject(
          new Error("Recognition is unavailable. Your text is still here."),
        );
      else resolve(recognizeFixture(request));
    }, delay);
    if (signal.aborted) abort();
    else signal.addEventListener("abort", abort, { once: true });
  });
}
