import { preparePhoto } from "@/lib/recipe-photo/prepare-photo";
import {
  PhotoUploadError,
  validatePhoto,
  type PhotoFocus,
  type SavedPhoto,
  type UploadPhoto,
} from "@/lib/recipe-photo/types";
import { useEffect, useRef, useState } from "react";

type UploadState =
  | { status: "empty" }
  | { status: "saved" }
  | { status: "uploading"; progress?: number }
  | { status: "ready"; filename: string }
  | { status: "error"; message: string };

export function usePhotoUpload(
  upload: UploadPhoto | undefined,
  existingPhoto?: SavedPhoto,
) {
  const initialFocus: PhotoFocus =
    existingPhoto?.focus?.length === 2
      ? [existingPhoto.focus[0], existingPhoto.focus[1]]
      : [0.5, 0.5];
  const [state, setState] = useState<UploadState>({
    status: existingPhoto ? "saved" : "empty",
  });
  const [isPreparing, setIsPreparing] = useState(false);
  const preparing = useRef<AbortController | undefined>(undefined);
  const [selectionError, setSelectionError] = useState<string>();
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(
    existingPhoto?.url,
  );
  const [focus, setFocus] = useState<PhotoFocus>(initialFocus);
  const file = useRef<File | undefined>(undefined);
  const active = useRef<AbortController | undefined>(undefined);
  const currentState = useRef(state);
  const preview = useRef<string | undefined>(undefined);

  function update(next: UploadState) {
    currentState.current = next;
    setState(next);
  }

  function changePreview(url: string | undefined) {
    if (preview.current) URL.revokeObjectURL(preview.current);
    preview.current = url;
    setPreviewUrl(url);
  }

  useEffect(
    () => () => {
      preparing.current?.abort();
      preparing.current = undefined;
      active.current?.abort();
      if (preview.current) URL.revokeObjectURL(preview.current);
    },
    [],
  );

  async function start(selected: File) {
    if (!upload) return;
    setSelectionError(undefined);
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    update({ status: "uploading" });
    try {
      const filename = await upload(selected, {
        signal: controller.signal,
        onProgress: (progress) => {
          if (!controller.signal.aborted)
            update({ status: "uploading", progress });
        },
      });
      if (!controller.signal.aborted) update({ status: "ready", filename });
    } catch (error) {
      if (!controller.signal.aborted)
        update({
          status: "error",
          message:
            error instanceof PhotoUploadError
              ? error.message
              : "Photo upload failed. Please retry.",
        });
    }
  }

  function cancelPreparation() {
    preparing.current?.abort();
    preparing.current = undefined;
    setIsPreparing(false);
  }

  async function select(selected: File) {
    cancelPreparation();
    const controller = new AbortController();
    try {
      validatePhoto(selected);
      preparing.current = controller;
      setIsPreparing(true);
      setSelectionError(undefined);
      const prepared = await preparePhoto(selected, controller.signal);
      if (controller.signal.aborted) return;
      const nextPreview = URL.createObjectURL(prepared);
      // Commit the replacement only after decoding and resizing succeed.
      file.current = prepared;
      setFocus([0.5, 0.5]);
      changePreview(nextPreview);
      void start(prepared);
    } catch (error) {
      if (!controller.signal.aborted)
        setSelectionError(
          error instanceof PhotoUploadError
            ? error.message
            : "This photo couldn’t be prepared. Choose another photo.",
        );
    } finally {
      if (preparing.current === controller) {
        preparing.current = undefined;
        setIsPreparing(false);
      }
    }
  }

  function clear() {
    cancelPreparation();
    setSelectionError(undefined);
    active.current?.abort();
    file.current = undefined;
    changePreview(undefined);
    setPreviewUrl(existingPhoto?.url);
    setFocus(initialFocus);
    update({ status: existingPhoto ? "saved" : "empty" });
  }

  return {
    state,
    hasSavedPhoto: !!existingPhoto,
    isPreparing,
    selectionError,
    previewUrl,
    focus,
    setFocus,
    select,
    clear,
    retry: () => {
      cancelPreparation();
      if (file.current) void start(file.current);
    },
    canSave: () =>
      !preparing.current &&
      ["empty", "saved", "ready"].includes(currentState.current.status),
    savedPhoto: () =>
      currentState.current.status === "ready"
        ? { filename: currentState.current.filename, focus }
        : currentState.current.status === "saved" &&
            (focus[0] !== initialFocus[0] || focus[1] !== initialFocus[1])
          ? { focus }
          : undefined,
    invalidateAfterSaveFailure: () => {
      if (file.current && currentState.current.status === "ready") {
        // The API may have consumed the scratch file before the save failed.
        update({
          status: "error",
          message:
            "Please retry the photo upload before saving again. Your photo and focus are still here.",
        });
      }
    },
  };
}
