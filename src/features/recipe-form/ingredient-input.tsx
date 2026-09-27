"use client";

import { RecognizedRangeType } from "@/__generated__/graphql";
import { Button, Input, Label, TextField } from "@heroui/react";
import {
  useId,
  useRef,
  type ClipboardEventHandler,
  type KeyboardEventHandler,
  type RefCallback,
} from "react";
import type { IngredientDraft } from "./ingredient-draft";
import {
  recognizedParts,
  type IngredientRecognition,
  type RecognizeIngredient,
} from "./ingredient-recognition";
import type { RecognitionQueue } from "./recognition-queue";
import { useIngredientRecognition } from "./use-ingredient-recognition";

export function IngredientInput({
  row,
  number,
  helpId,
  isDisabled,
  inputRef,
  onChange,
  onRecognized,
  onKeyDown,
  onPaste,
  recognize,
  queue,
}: {
  row: IngredientDraft;
  number: number;
  helpId: string;
  isDisabled: boolean;
  inputRef: RefCallback<HTMLInputElement>;
  onChange: (raw: string) => void;
  onRecognized: (result: IngredientRecognition) => void;
  onKeyDown: KeyboardEventHandler<HTMLInputElement>;
  onPaste: ClipboardEventHandler<HTMLInputElement>;
  recognize: RecognizeIngredient;
  queue: RecognitionQueue;
}) {
  const input = useRef<HTMLInputElement | null>(null);
  const feedbackId = useId();
  const recognition = useIngredientRecognition({
    ...row,
    isDisabled,
    recognize,
    queue,
    onRecognized,
  });
  const result = row.recognition?.raw === row.raw ? row.recognition : undefined;
  const parts = result ? recognizedParts(result) : undefined;
  const preview =
    result && parts
      ? [
          {
            label: "Quantity",
            range: parts.quantity,
            className: "bg-accent-soft text-accent-soft-foreground",
          },
          {
            label:
              parts.unit?.type === RecognizedRangeType.NEW_UNIT
                ? "New unit"
                : "Unit",
            range: parts.unit,
            className: "bg-success-soft text-success-soft-foreground",
          },
          {
            label:
              parts.ingredient?.type === RecognizedRangeType.NEW_ITEM
                ? "New ingredient"
                : "Ingredient",
            range: parts.ingredient,
            className: "bg-default text-default-foreground",
          },
        ].flatMap(({ label, range, className }) =>
          range
            ? [
                {
                  label,
                  text: result.raw.slice(range.start, range.end),
                  className,
                },
              ]
            : [],
        )
      : [];

  return (
    <div className="grid min-w-0 flex-1 grid-cols-1 items-start gap-sm sm:grid-cols-2">
      <TextField
        className="min-w-0"
        isDisabled={isDisabled}
        value={row.raw}
        onChange={(raw) => {
          recognition.schedule(
            raw,
            input.current?.selectionStart ?? raw.length,
          );
          onChange(raw);
        }}
      >
        <Label className="sr-only">Ingredient {number}</Label>
        <Input
          aria-describedby={`${helpId} ${feedbackId}`}
          placeholder="e.g. 2 cups flour"
          ref={(element) => {
            input.current = element;
            inputRef(element);
          }}
          onFocus={(event) => {
            queue.focus(row.clientId);
            recognition.schedule(
              event.currentTarget.value,
              event.currentTarget.selectionStart ?? row.raw.length,
            );
          }}
          onBlur={() => queue.focus(undefined)}
          onSelect={(event) =>
            recognition.schedule(
              event.currentTarget.value,
              event.currentTarget.selectionStart ?? row.raw.length,
            )
          }
          onCompositionStart={recognition.startComposition}
          onCompositionEnd={(event) =>
            recognition.endComposition(
              event.currentTarget.value,
              event.currentTarget.selectionStart ?? row.raw.length,
            )
          }
          onKeyDown={onKeyDown}
          onPaste={(event) => {
            if (/[\r\n]/.test(event.clipboardData.getData("text/plain")))
              recognition.cancel();
            onPaste(event);
          }}
        />
      </TextField>
      <div
        id={feedbackId}
        className="min-w-0 text-sm"
        aria-live="polite"
        aria-atomic="true"
      >
        {recognition.status === "pending" ? (
          <span className="text-muted">Recognizing…</span>
        ) : null}
        {recognition.status === "error" ? (
          <div className="flex items-center gap-sm text-warning">
            <span>
              Couldn’t recognize this ingredient. Your text will still be saved.
            </span>
            <Button
              size="sm"
              variant="tertiary"
              type="button"
              isDisabled={isDisabled}
              aria-label={`Retry recognition for ingredient ${number}`}
              onPress={() =>
                recognition.schedule(
                  row.raw,
                  input.current?.selectionStart ?? row.raw.length,
                  true,
                )
              }
            >
              Retry
            </Button>
          </div>
        ) : null}
        {result && parts ? (
          <dl
            aria-label={`Recognition for ingredient ${number}`}
            className="flex flex-wrap gap-xs"
          >
            {preview.map((part) => (
              <div
                key={part.label}
                className={`rounded-sm px-xs py-xxs ${part.className}`}
              >
                <dt className="text-xs font-medium">{part.label}</dt>
                <dd className="whitespace-pre-wrap break-words">{part.text}</dd>
              </div>
            ))}
            {parts.preparation ? (
              <div className="px-xs py-xxs text-muted">
                <dt className="text-xs font-medium">Preparation</dt>
                <dd className="break-words">{parts.preparation}</dd>
              </div>
            ) : null}
            {!parts.ingredient ? (
              <div className="w-full text-muted">
                <dt className="sr-only">Recognition status</dt>
                <dd>
                  No ingredient recognized. Your text will still be saved.
                </dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </div>
    </div>
  );
}
