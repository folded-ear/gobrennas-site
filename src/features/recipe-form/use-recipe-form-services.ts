"use client";

import type { UploadPhoto } from "@/features/recipe-photo-editor/types";
import { uploadPhoto as uploadRecipePhoto } from "@/features/recipe-photo-editor/upload-photo";
import { useApolloClient, useQuery } from "@apollo/client/react";
import { useCallback } from "react";
import { RecipeLabelSuggestionsDocument } from "./__generated__/recipeLabelSuggestions.generated";
import { RecipePhotoUploadDocument } from "./__generated__/recipePhotoUpload.generated";
import { useRecognizeIngredient } from "./use-recognize-ingredient";

export function useRecipeFormServices() {
  const client = useApolloClient();
  const labelSuggestions = useQuery(RecipeLabelSuggestionsDocument);
  const uploadPhoto = useCallback<UploadPhoto>(
    (file, options) =>
      uploadRecipePhoto(
        file,
        async (prepared, signal) => {
          const result = await client.query({
            query: RecipePhotoUploadDocument,
            variables: {
              contentType: prepared.type,
              originalFilename: prepared.name,
            },
            fetchPolicy: "no-cache",
            context: { queryDeduplication: false, fetchOptions: { signal } },
          });
          return result.data?.profile.scratchFile;
        },
        options,
      ),
    [client],
  );

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
