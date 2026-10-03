"use client";

import { useApolloClient } from "@apollo/client/react";
import { useCallback } from "react";
import { RecognizeIngredientDocument } from "./__generated__/recognizeIngredient.generated";
import {
  ingredientRecognitionSchema,
  type RecognizeIngredient,
} from "./ingredient-recognition";

/** The shared Morsel recognition request, including explicit suggestion choices. */
export function useRecognizeIngredient() {
  const client = useApolloClient();
  return useCallback<RecognizeIngredient>(
    async (raw, cursor, signal, options) => {
      const result = await client.query({
        query: RecognizeIngredientDocument,
        variables: {
          raw,
          cursor,
          suggest: options?.suggest ?? false,
          choice: options?.choice
            ? { id: options.choice.food.id, ...options.choice.range }
            : null,
        },
        fetchPolicy: "no-cache",
        context: { queryDeduplication: false, fetchOptions: { signal } },
      });
      return ingredientRecognitionSchema.parse(
        result.data?.library.recognizeItem,
      );
    },
    [client],
  );
}
