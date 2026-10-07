"use client";

import { useApolloClient } from "@apollo/client/react";
import { useCallback } from "react";
import { RecipePhotoUploadDocument } from "./__generated__/recipePhotoUpload.generated";
import type { UploadPhoto } from "./types";
import { uploadPhoto } from "./upload-photo";

/** Upload a prepared image using the existing scratch-file service. */
export function useUploadPhoto() {
  const client = useApolloClient();
  return useCallback<UploadPhoto>(
    (file, options) =>
      uploadPhoto(
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
}
