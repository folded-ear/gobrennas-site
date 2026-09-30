import { useEffect, useRef, useState } from "react";
import {
  PhotoUploadError,
  validatePhoto,
  type PhotoFocus,
  type UploadPhoto,
} from "./types";

type UploadState =
  | { status: "empty" }
  | { status: "uploading"; progress?: number }
  | { status: "ready"; filename: string }
  | { status: "error"; message: string };

export function usePhotoUpload(upload: UploadPhoto | undefined) {
  const [state, setState] = useState<UploadState>({ status: "empty" });
  const [selectionError, setSelectionError] = useState<string>();
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [focus, setFocus] = useState<PhotoFocus>([0.5, 0.5]);
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
      active.current?.abort();
      if (preview.current) URL.revokeObjectURL(preview.current);
    },
    [],
  );

  async function start(selected: File) {
    if (!upload) return;
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

  function select(selected: File) {
    let nextPreview: string;
    try {
      validatePhoto(selected);
      nextPreview = URL.createObjectURL(selected);
    } catch (error) {
      setSelectionError(
        error instanceof PhotoUploadError
          ? error.message
          : "Choose another photo.",
      );
      return;
    }
    setSelectionError(undefined);
    active.current?.abort();
    file.current = selected;
    setFocus([0.5, 0.5]);
    changePreview(nextPreview);
    void start(selected);
  }

  function clear() {
    setSelectionError(undefined);
    active.current?.abort();
    file.current = undefined;
    changePreview(undefined);
    setFocus([0.5, 0.5]);
    update({ status: "empty" });
  }

  return {
    state,
    selectionError,
    previewUrl,
    focus,
    setFocus,
    select,
    clear,
    retry: () => {
      if (file.current) void start(file.current);
    },
    canSave: () => ["empty", "ready"].includes(currentState.current.status),
    savedPhoto: () =>
      currentState.current.status === "ready"
        ? { filename: currentState.current.filename, focus }
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
