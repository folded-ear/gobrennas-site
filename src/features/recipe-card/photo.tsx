"use client";

import { RecipePhoto } from "@/features/recipe-photo";
import { preparePhoto } from "@/lib/recipe-photo/prepare-photo";
import { PHOTO_ACCEPT, PhotoUploadError } from "@/lib/recipe-photo/types";
import { useUploadPhoto } from "@/lib/recipe-photo/use-upload-photo";
import { FragmentType } from "@apollo/client";
import { useFragment, useMutation } from "@apollo/client/react";
import { Button } from "@heroui/react";
import clsx from "clsx";
import { CloudUpload } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import {
  CardPhotoFragment,
  CardPhotoFragmentDoc,
} from "./__generated__/cardPhoto.generated";
import { SetCardPhotoDocument } from "./__generated__/setCardPhoto.generated";

export function CardPhoto({
  recipe,
}: {
  recipe: FragmentType<CardPhotoFragment>;
}) {
  const { data, complete } = useFragment({
    fragment: CardPhotoFragmentDoc,
    fragmentName: "cardPhoto",
    from: recipe,
  });
  const upload = useUploadPhoto();
  const [save] = useMutation(SetCardPhotoDocument);
  const input = useRef<HTMLInputElement>(null);
  const active = useRef<AbortController | undefined>(undefined);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const messageId = useId();
  useEffect(() => () => active.current?.abort(), []);

  async function select(file: File | undefined) {
    if (!file || active.current || !complete || !data.mine || data.photo)
      return;
    const controller = new AbortController();
    active.current = controller;
    setError("");
    setProgress("Preparing…");
    try {
      const prepared = await preparePhoto(file, controller.signal);
      setProgress("Uploading…");
      const filename = await upload(prepared, {
        signal: controller.signal,
        onProgress: (percent) => {
          if (!controller.signal.aborted) setProgress(`Uploading ${percent}%…`);
        },
      });
      controller.signal.throwIfAborted();
      setProgress("Saving…");
      const result = await save({
        variables: { id: data.id, filename },
        context: { fetchOptions: { signal: controller.signal } },
      });
      if (
        result.data?.library.setRecipePhoto.id !== data.id ||
        !result.data.library.setRecipePhoto.photo
      )
        throw new Error("Photo save returned no matching photo.");
    } catch (failure) {
      if (!controller.signal.aborted) {
        setError(
          failure instanceof PhotoUploadError
            ? failure.message
            : "Couldn’t save photo. Drop or choose it again.",
        );
      }
    } finally {
      if (!controller.signal.aborted) setProgress("");
      active.current = undefined;
    }
  }

  if (!complete) return null;
  const canUpload = data.mine && !data.photo;
  return (
    <>
      {/* A quarter of each card, accounting for library padding and grid gaps. */}
      {!canUpload && (
        <RecipePhoto
          recipe={data}
          sizes="(min-width: 64rem) calc((100vw - 56px) / 12), (min-width: 48rem) calc((100vw - 40px) / 8), calc((100vw - 24px) / 4)"
        />
      )}
      {canUpload ? (
        <div
          className="absolute inset-0"
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = progress ? "none" : "copy";
            if (!progress) setDragging(true);
          }}
          onDragLeave={(event) => {
            if (
              !(event.relatedTarget instanceof Node) ||
              !event.currentTarget.contains(event.relatedTarget)
            )
              setDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setDragging(false);
            void select(event.dataTransfer.files[0]);
          }}
        >
          <Button
            aria-label={`Add photo: ${data.name}`}
            aria-describedby={messageId}
            isDisabled={!!progress}
            variant="ghost"
            className={clsx(
              "h-full w-full min-w-0 flex-col justify-center rounded-none p-xs",
              dragging && "bg-accent-soft ring-2 ring-inset ring-accent",
            )}
            onPress={() => input.current?.click()}
          >
            {progress ? (
              <span className="whitespace-normal p-xs text-xs text-foreground">
                {progress}
              </span>
            ) : (
              <CloudUpload
                size={50}
                strokeWidth={2}
                className="text-muted/40"
                aria-hidden="true"
              />
            )}
          </Button>
          <input
            ref={input}
            type="file"
            accept={PHOTO_ACCEPT}
            aria-label={`Photo for ${data.name}`}
            className="hidden"
            disabled={!!progress}
            onChange={(event) => {
              void select(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <span
            id={messageId}
            role={error ? "alert" : "status"}
            className={
              error
                ? "absolute inset-x-0 top-0 bg-background/95 p-xs text-xs text-danger"
                : "sr-only"
            }
          >
            {error || progress}
          </span>
        </div>
      ) : null}
    </>
  );
}
