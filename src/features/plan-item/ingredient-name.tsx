"use client";

import { humanQuantity } from "@/features/morsel/quantity";
import { RecognizeIngredientDocument } from "@/features/recipe-form/__generated__/recognizeIngredient.generated";
import {
  ingredientRecognitionSchema,
  toMorselRecognition,
} from "@/features/recipe-form/ingredient-recognition";
import { useQuery } from "@apollo/client/react";
import { Fragment, type ReactNode } from "react";

/** Decorate the original wording, showing quantities as fractions, without rebuilding it from parsed ingredients. */
export function IngredientName({ name }: { name: string }) {
  const skip = name.startsWith("!") || name.trim().length < 2;
  const { data } = useQuery(RecognizeIngredientDocument, {
    variables: { raw: name, cursor: name.length, choice: null, suggest: false },
    // Recognition range IDs name ingredients, not globally unique text ranges.
    fetchPolicy: "no-cache",
    skip,
  });
  const parsed = ingredientRecognitionSchema.safeParse(
    data?.library.recognizeItem,
  );
  if (skip || !parsed.success || parsed.data.raw !== name) {
    return <>{name}</>;
  }

  const ranges = toMorselRecognition(parsed.data).ranges.toSorted(
    (a, b) => a.start - b.start,
  );
  const pieces: ReactNode[] = [];
  let cursor = 0;
  for (const range of ranges) {
    // Overlapping ranges cannot be represented as separate text spans safely.
    if (range.start < cursor) return <>{name}</>;
    const text = name.slice(range.start, range.end);
    pieces.push(
      <Fragment key={`${range.start}-${range.end}`}>
        {name.slice(cursor, range.start)}
        <span className={`morsel-${range.type}`}>
          {range.type === "quantity"
            ? humanQuantity(range.quantity, text)
            : text}
        </span>
      </Fragment>,
    );
    cursor = range.end;
  }
  return (
    <span className="morsel-text whitespace-pre-wrap">
      {pieces}
      {name.slice(cursor)}
    </span>
  );
}
