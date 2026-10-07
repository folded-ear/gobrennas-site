"use client";

import { useUploadPhoto } from "@/lib/recipe-photo/use-upload-photo";
import { useQuery } from "@apollo/client/react";
import { RecipeLabelSuggestionsDocument } from "./__generated__/recipeLabelSuggestions.generated";
import { useRecognizeIngredient } from "./use-recognize-ingredient";

export function useRecipeFormServices() {
  const labelSuggestions = useQuery(RecipeLabelSuggestionsDocument);
  const uploadPhoto = useUploadPhoto();

  const recognizeIngredient = useRecognizeIngredient();

  return {
    uploadPhoto,
    recognizeIngredient,
    labelSuggestions: {
      labels:
        labelSuggestions.data?.labels.all.map((label) => label.name) ?? [],
      isLoading: labelSuggestions.loading,
      hasError: !!labelSuggestions.error,
      onRetry: () => {
        void labelSuggestions.refetch().catch(() => {
          /* The query renders the retryable error state. */
        });
      },
    },
  };
}
