"use client";

import { AddRecipeButton } from "@/features/add-recipe-button";
import { PhotosScreen } from "@/features/photos-screen";
import { useHistoryState } from "@/hooks/use-history-state";
import { addRecipeFromPhotoHref } from "@/lib/routes";
import { useRouter } from "next/navigation";

/** Where the Library's history entry says its Photos screen is open. */
const PHOTOS_KEY = "libraryPhotos";

/**
 * I'm the Library's way to add a recipe: blank, or from a photo. From a
 * photo, the Photos screen opens over the Library, and gives way to the
 * add form once a photo is picked, by the user or for them.
 */
export function LibraryAddRecipe() {
  const router = useRouter();
  const photos = useHistoryState<true>(PHOTOS_KEY);
  return (
    <>
      <AddRecipeButton onAddFromPhoto={() => photos.push(true)} />
      <PhotosScreen
        isOpen={photos.value === true}
        picksForUser
        // The add form takes the Photos screen's place in history.
        onPick={(jobId) => router.replace(addRecipeFromPhotoHref(jobId))}
      />
    </>
  );
}
