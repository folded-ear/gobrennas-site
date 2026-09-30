"use client";

import { Button, Label, ProgressBar } from "@heroui/react";
import { useId, useRef, type PointerEvent } from "react";
import { PHOTO_ACCEPT, clampFocus, type PhotoFocus } from "./types";
import type { usePhotoUpload } from "./use-photo-upload";

type PhotoEditorProps = {
  photo: ReturnType<typeof usePhotoUpload>;
  isDisabled: boolean;
  onEdit: () => void;
};

export function PhotoEditor({ photo, isDisabled, onEdit }: PhotoEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const helpId = useId();
  const { state, previewUrl, focus } = photo;
  function select(file: File | undefined) {
    if (isDisabled || !file) return;
    onEdit();
    void photo.select(file);
  }
  function setFocus(next: PhotoFocus) {
    if (isDisabled) return;
    onEdit();
    photo.setFocus(next);
  }
  function position(event: PointerEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    setFocus([
      clampFocus((event.clientX - rect.left) / rect.width),
      clampFocus((event.clientY - rect.top) / rect.height),
    ]);
  }

  return (
    <fieldset className="flex min-w-0 flex-col gap-sm" disabled={isDisabled}>
      <legend className="mb-sm text-xs font-medium">Photo</legend>
      <div
        className="flex flex-col gap-md rounded-field border border-dashed border-border p-md"
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = isDisabled ? "none" : "copy";
        }}
        onDrop={(event) => {
          event.preventDefault();
          select(event.dataTransfer.files[0]);
        }}
      >
        <div className="flex flex-wrap items-center gap-sm">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            isDisabled={isDisabled}
            onPress={() => inputRef.current?.click()}
          >
            {previewUrl ? "Choose another photo" : "Choose photo"}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept={PHOTO_ACCEPT}
            aria-label="Recipe photo"
            className="hidden"
            disabled={isDisabled}
            onChange={(event) => {
              select(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <span className="text-sm text-muted">Or drop an image here.</span>
          {(state.status !== "empty" && state.status !== "saved") ||
          photo.isPreparing ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              isDisabled={isDisabled}
              onPress={() => {
                onEdit();
                photo.clear();
              }}
            >
              {photo.hasSavedPhoto ? "Discard replacement" : "Discard photo"}
            </Button>
          ) : null}
        </div>
        {previewUrl ? (
          <div className="grid items-start gap-md @lg:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-sm">
              <div className="relative w-fit max-w-full overflow-hidden rounded-field">
                {/* Local blob previews must not go through the Next image proxy. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Selected recipe photo"
                  className="block max-h-64 max-w-full"
                />
                <button
                  type="button"
                  aria-label="Photo focus"
                  aria-describedby={helpId}
                  disabled={isDisabled}
                  className="absolute inset-0 touch-none cursor-crosshair focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
                  onPointerDown={(event) => {
                    if (event.button !== 0 || isDisabled) return;
                    event.currentTarget.setPointerCapture(event.pointerId);
                    position(event);
                  }}
                  onPointerMove={(event) => {
                    if (event.currentTarget.hasPointerCapture(event.pointerId))
                      position(event);
                  }}
                  onPointerUp={(event) => {
                    if (event.currentTarget.hasPointerCapture(event.pointerId))
                      event.currentTarget.releasePointerCapture(
                        event.pointerId,
                      );
                  }}
                  onClick={(event) => {
                    if (event.detail === 0) setFocus([0.5, 0.5]);
                  }}
                  onKeyDown={(event) => {
                    const step = event.shiftKey ? 0.1 : 0.01;
                    const offsets: Record<string, PhotoFocus> = {
                      ArrowLeft: [-step, 0],
                      ArrowRight: [step, 0],
                      ArrowUp: [0, -step],
                      ArrowDown: [0, step],
                    };
                    const offset = offsets[event.key];
                    if (offset) {
                      event.preventDefault();
                      setFocus([
                        clampFocus(focus[0] + offset[0]),
                        clampFocus(focus[1] + offset[1]),
                      ]);
                    }
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-black/20 shadow-[0_0_0_1px_black]"
                    style={{
                      left: `${focus[0] * 100}%`,
                      top: `${focus[1] * 100}%`,
                    }}
                  />
                </button>
              </div>
              <p id={helpId} className="text-xs text-muted">
                Click or drag to choose the focus. Use arrow keys to adjust,
                Shift for larger steps, or Enter to center.
              </p>
              <p role="status" className="sr-only">
                Photo focus: {Math.round(focus[0] * 100)}% from left,{" "}
                {Math.round(focus[1] * 100)}% from top.
              </p>
            </div>
            <div className="flex min-w-0 flex-col gap-sm">
              <p className="text-xs font-medium">Crop preview</p>
              <figure className="w-1/4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Narrow crop preview"
                  className="aspect-3/4 w-full rounded-field object-cover"
                  style={{
                    objectPosition: `${focus[0] * 100}% ${focus[1] * 100}%`,
                  }}
                />
              </figure>
              <p className="text-xs text-muted">
                The same focus is used on recipe cards and detail pages.
                Cropping varies with screen size.
              </p>
            </div>
          </div>
        ) : null}
        {photo.isPreparing ? (
          <p role="status" className="text-sm text-muted">
            Preparing photo…
          </p>
        ) : null}
        {state.status === "uploading" ? (
          <ProgressBar
            aria-label="Photo upload"
            value={state.progress ?? 0}
            isIndeterminate={state.progress === undefined}
            size="sm"
          >
            <Label className="text-xs">
              {state.progress === undefined
                ? "Starting upload…"
                : state.progress === 100
                  ? "Finishing upload…"
                  : "Uploading photo…"}
            </Label>
            {state.progress !== undefined ? <ProgressBar.Output /> : null}
            <ProgressBar.Track>
              <ProgressBar.Fill />
            </ProgressBar.Track>
          </ProgressBar>
        ) : null}
        {photo.selectionError ? (
          <p role="alert" className="text-sm text-danger">
            {photo.selectionError}
          </p>
        ) : null}
        {state.status === "error" ? (
          <div className="flex flex-wrap items-center gap-sm">
            <p role="alert" className="text-sm text-danger">
              {state.message}
            </p>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              isDisabled={isDisabled}
              onPress={() => {
                onEdit();
                photo.retry();
              }}
            >
              Retry photo upload
            </Button>
          </div>
        ) : null}
        {state.status === "ready" ? (
          <p role="status" className="text-sm text-muted">
            Photo ready. Save recipe to keep it.
          </p>
        ) : null}
      </div>
    </fieldset>
  );
}
