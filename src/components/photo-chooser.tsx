"use client";

import { PHOTO_ACCEPT } from "@/lib/recipe-photo/types";
import { Button } from "@heroui/react";
import clsx from "clsx";
import { type ReactNode, useRef } from "react";

type PhotoChooserProps = {
  /** What my button says. */
  label: string;
  /** Names my file input for assistive technology. */
  inputLabel: string;
  /** Whether I take several photos at once. Otherwise I take the first. */
  multiple?: boolean;
  isDisabled?: boolean;
  onChoose: (files: File[]) => void;
  /** Controls shown beside my button. */
  actions?: ReactNode;
  /** Shown below my button, inside where photos can be dropped. */
  children?: ReactNode;
  className?: string;
};

/**
 * I take photos from a file picker or dropped onto me. I check nothing
 * about them.
 */
export function PhotoChooser({
  label,
  inputLabel,
  multiple = false,
  isDisabled = false,
  onChoose,
  actions,
  children,
  className,
}: PhotoChooserProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function choose(files: FileList | null | undefined) {
    if (isDisabled || !files || files.length === 0) return;
    onChoose(multiple ? [...files] : [files[0]]);
  }

  return (
    <div
      className={clsx(
        "flex flex-col gap-md rounded-field border border-dashed border-border p-md",
        className,
      )}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = isDisabled ? "none" : "copy";
      }}
      onDrop={(event) => {
        event.preventDefault();
        choose(event.dataTransfer.files);
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
          {label}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={PHOTO_ACCEPT}
          multiple={multiple}
          aria-label={inputLabel}
          className="hidden"
          disabled={isDisabled}
          onChange={(event) => {
            choose(event.target.files);
            event.target.value = "";
          }}
        />
        <span className="text-sm text-muted">
          {multiple ? "Or drop images here." : "Or drop an image here."}
        </span>
        {actions}
      </div>
      {children}
    </div>
  );
}
