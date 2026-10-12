"use client";

import { PhotosIcon } from "@/components/icons";
import { PhotoView } from "@/features/photo-view";
import { PhotosScreen } from "@/features/photos-screen";
import type { RecipeFormAdditions } from "@/features/recipe-form";
import { useHistoryState } from "@/hooks/use-history-state";
import { Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";

/** Where an editor's history entry says its Photos screen is open. */
const PHOTOS_KEY = "editorPhotos";

/**
 * I give a recipe editor its photos: what to add to its form, and the
 * Photos screen to render beside it. The form gains a header control that
 * opens the screen, and above its fields the photo picked there, whose
 * text goes into the form. I start on a photo if handed one.
 */
export function useEditorPhotos(initialJobId?: string): {
  additions: RecipeFormAdditions;
  photosScreen: ReactNode;
} {
  const router = useRouter();
  const photos = useHistoryState<true>(PHOTOS_KEY);
  const [jobId, setJobId] = useState(initialJobId);
  return {
    additions: {
      headerActions: (
        <Button
          isIconOnly
          variant="secondary"
          aria-label="Photos"
          onPress={() => photos.push(true)}
        >
          <PhotosIcon aria-hidden size="small" />
        </Button>
      ),
      aboveFields: (writes, isDisabled) =>
        jobId === undefined ? null : (
          <PhotoView
            jobId={jobId}
            writes={writes}
            isDisabled={isDisabled}
            onClose={() => setJobId(undefined)}
          />
        ),
    },
    photosScreen: (
      <PhotosScreen
        isOpen={photos.value === true}
        onPick={(picked) => {
          setJobId(picked);
          // Closing a screen is going back, however it's closed.
          router.back();
        }}
      />
    ),
  };
}
