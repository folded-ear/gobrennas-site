"use client";

import { RecognizedRangeType } from "@/__generated__/graphql";
import { Morsel } from "@/features/morsel";
import { createChoiceHistory } from "@/features/morsel/choice-history";
import { readSelection } from "@/features/morsel/editor-dom";
import type {
  MorselChoice,
  MorselRecognition,
  TextRange,
} from "@/features/morsel/types";
import { Button } from "@heroui/react";
import {
  useId,
  useLayoutEffect,
  useRef,
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
  pastedRow,
  inputRef,
  onChange,
  onChoose,
  onRecognized,
  onKeyDown,
  onEnter,
  onPasteLines,
  recognize,
  queue,
}: {
  row: IngredientDraft;
  number: number;
  helpId: string;
  isDisabled: boolean;
  pastedRow?: { raw: string };
  inputRef: RefCallback<HTMLDivElement>;
  onChange: (raw: string, choice?: MorselChoice) => void;
  onChoose: (raw: string, choice: MorselChoice) => void;
  onRecognized: (result: IngredientRecognition) => void;
  onKeyDown: KeyboardEventHandler<HTMLDivElement>;
  onEnter: () => void;
  onPasteLines: (text: string, selection: TextRange) => boolean;
  recognize: RecognizeIngredient;
  queue: RecognitionQueue;
}) {
  const input = useRef<HTMLDivElement>(null);
  const feedbackId = useId();
  const history = useRef(createChoiceHistory(row));
  useLayoutEffect(
    () => history.current.sync({ raw: row.raw, choice: row.choice }),
    [row.raw, row.choice],
  );
  const recognition = useIngredientRecognition({
    ...row,
    isDisabled,
    pastedRow,
    recognize,
    queue,
    onRecognized,
  });
  const result = row.recognition?.raw === row.raw ? row.recognition : undefined;
  const parts = result ? recognizedParts(result) : undefined;
  const ranges: MorselRecognition["ranges"] | undefined =
    result?.ranges.flatMap((range) => {
      const type =
        range.type === RecognizedRangeType.QUANTITY
          ? "quantity"
          : range.type === RecognizedRangeType.UNIT ||
              range.type === RecognizedRangeType.NEW_UNIT
            ? "unit"
            : range.type === RecognizedRangeType.ITEM ||
                range.type === RecognizedRangeType.NEW_ITEM
              ? "ingredient"
              : undefined;
      return type ? [{ start: range.start, end: range.end, type }] : [];
    });

  return (
    <div className="min-w-0 flex-1">
      <Morsel
        value={row.raw}
        label={`Ingredient ${number}`}
        descriptionId={`${helpId} ${feedbackId}`}
        isDisabled={isDisabled}
        recognition={result && ranges ? { raw: result.raw, ranges } : undefined}
        suggestions={recognition.suggestions}
        inputRef={(element) => {
          input.current = element;
          inputRef(element);
        }}
        onChange={(raw, cursor, inputType) => {
          const choice = history.current.edit(raw, inputType);
          recognition.schedule(raw, cursor, { choice });
          onChange(raw, choice);
        }}
        onChoose={(raw, cursor, choice) => {
          history.current.choose(raw, choice);
          recognition.schedule(raw, cursor, { choice, retry: true });
          onChoose(raw, choice);
        }}
        onFocus={(cursor) => {
          queue.focus(row.clientId);
          recognition.focus(cursor);
        }}
        onBlur={() => {
          queue.focus(undefined);
          recognition.blur();
        }}
        onCursorChange={(cursor) => recognition.schedule(row.raw, cursor)}
        onCompositionStart={recognition.startComposition}
        onCompositionEnd={(raw, cursor) =>
          recognition.endComposition(raw, cursor, history.current.edit(raw))
        }
        onKeyDown={onKeyDown}
        onEnter={onEnter}
        onPasteLines={(text, selection) => {
          if (/[\r\n]/.test(text)) recognition.cancel();
          return onPasteLines(text, selection);
        }}
      />
      <div
        id={feedbackId}
        className="text-xs"
        aria-live="polite"
        aria-atomic="true"
      >
        {recognition.status === "pending" && (
          <span className="text-muted">Recognizing…</span>
        )}
        {recognition.status === "error" && (
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
                  input.current
                    ? readSelection(input.current).start
                    : row.raw.length,
                  { retry: true },
                )
              }
            >
              Retry
            </Button>
          </div>
        )}
        {result && parts && (
          <dl
            aria-label={`Recognition for ingredient ${number}`}
            className="sr-only"
          >
            {parts.quantity && (
              <div>
                <dt>Quantity</dt>
                <dd>
                  {row.raw.slice(parts.quantity.start, parts.quantity.end)}
                </dd>
              </div>
            )}
            {parts.unit && (
              <div>
                <dt>
                  {parts.unit.type === RecognizedRangeType.NEW_UNIT
                    ? "New unit"
                    : "Unit"}
                </dt>
                <dd>{row.raw.slice(parts.unit.start, parts.unit.end)}</dd>
              </div>
            )}
            {parts.ingredient && (
              <div>
                <dt>
                  {parts.ingredient.type === RecognizedRangeType.NEW_ITEM
                    ? "New ingredient"
                    : "Ingredient"}
                </dt>
                <dd>
                  {row.raw.slice(parts.ingredient.start, parts.ingredient.end)}
                </dd>
              </div>
            )}
            {parts.preparation && (
              <div>
                <dt>Preparation</dt>
                <dd>{parts.preparation}</dd>
              </div>
            )}
            {!parts.ingredient && (
              <div>
                <dt>Recognition status</dt>
                <dd>
                  No ingredient recognized. Your text will still be saved.
                </dd>
              </div>
            )}
          </dl>
        )}
      </div>
    </div>
  );
}
