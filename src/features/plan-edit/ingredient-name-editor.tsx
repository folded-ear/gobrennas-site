"use client";

import { useBlockScreenEscape } from "@/components/screen";
import { Morsel } from "@/features/morsel";
import { readSelection, selectRange } from "@/features/morsel/editor-dom";
import { RecognizeIngredientDocument } from "@/features/recipe-form/__generated__/recognizeIngredient.generated";
import {
  ingredientRecognitionSchema,
  toMorselRecognition,
  type IngredientRecognition,
  type RecognizeIngredient,
} from "@/features/recipe-form/ingredient-recognition";
import { createRecognitionQueue } from "@/features/recipe-form/recognition-queue";
import { useIngredientRecognition } from "@/features/recipe-form/use-ingredient-recognition";
import { useApolloClient } from "@apollo/client/react";
import { useCallback, useId, useLayoutEffect, useRef, useState } from "react";
import type { ItemNameEditorProps } from "./item-name-editor";
import { matchBinding, type Modifiers } from "./keymap";

/** The planner's existing editor contract, with recognition-only Morsel. */
export function IngredientNameEditor({
  initialText,
  caret,
  keymap,
  label,
  editKey,
  onChange,
  onEnd,
}: ItemNameEditorProps) {
  const client = useApolloClient();
  const input = useRef<HTMLDivElement>(null);
  const feedbackId = useId();
  const [value, setValue] = useState(initialText);
  const [result, setResult] = useState<IngredientRecognition>();
  const [queue] = useState(createRecognitionQueue);
  const recognitionDisabled = value.startsWith("!");
  useBlockScreenEscape(true);

  const recognize = useCallback<RecognizeIngredient>(
    async (raw, cursor, signal) => {
      const response = await client.query({
        query: RecognizeIngredientDocument,
        variables: { raw, cursor, choice: null, suggest: false },
        fetchPolicy: "no-cache",
        context: { queryDeduplication: false, fetchOptions: { signal } },
      });
      return ingredientRecognitionSchema.parse(
        response.data?.library.recognizeItem,
      );
    },
    [client],
  );
  const recognition = useIngredientRecognition({
    clientId: editKey,
    raw: value,
    isDisabled: false,
    recognize,
    queue,
    onRecognized: setResult,
  });

  useLayoutEffect(() => {
    const element = input.current;
    if (!element) return;
    element.dataset.editKey = editKey;
    element.focus();
    const at = caret === "start" ? 0 : (element.textContent?.length ?? 0);
    selectRange(element, { start: at, end: at });
  }, [caret, editKey]);

  const ranges =
    !recognitionDisabled && result?.raw === value
      ? toMorselRecognition(result).ranges
      : [];

  function bindingFor(key: string, modifiers: Required<Modifiers>) {
    const element = input.current;
    if (!element) return;
    const text = element.textContent ?? "";
    const selection = readSelection(element);
    const context = {
      key,
      modifiers,
      text,
      atStart: selection.start === 0 && selection.end === 0,
      atEnd: selection.start === text.length,
    };
    const binding = matchBinding(keymap, context);
    return binding ? () => binding.run(context) : undefined;
  }

  return (
    <div className="min-w-0 flex-1">
      <Morsel
        variant="inline"
        value={value}
        label={label}
        descriptionId={feedbackId}
        suggestionsEnabled={false}
        isPending={recognition.status === "pending"}
        recognition={{ raw: value, ranges }}
        inputRef={(element) => {
          input.current = element;
        }}
        onFocus={(cursor) => {
          if (!recognitionDisabled) recognition.schedule(value, cursor);
        }}
        onChange={(raw, cursor) => {
          setResult(undefined);
          setValue(raw);
          onChange(raw);
          if (raw.startsWith("!")) recognition.cancel();
          else recognition.schedule(raw, cursor);
        }}
        onCompositionStart={recognition.startComposition}
        onCompositionEnd={(raw, cursor) => {
          recognition.endComposition(raw, cursor);
          if (raw.startsWith("!")) recognition.cancel();
        }}
        onEnter={(event) =>
          bindingFor("Enter", {
            shift: event?.shiftKey ?? false,
            alt: event?.altKey ?? false,
            ctrl: event?.ctrlKey ?? false,
            meta: event?.metaKey ?? false,
          })?.()
        }
        onKeyDown={(event) => {
          // Morsel's onEnter also handles touch keyboards; do not split twice.
          if (event.key === "Enter") return;
          const run = bindingFor(event.key, {
            shift: event.shiftKey,
            alt: event.altKey,
            ctrl: event.ctrlKey,
            meta: event.metaKey,
          });
          if (!run) return;
          event.preventDefault();
          run();
        }}
        onBlur={() => {
          const text = input.current?.textContent ?? value;
          queueMicrotask(() => {
            const now = document.activeElement;
            if (now instanceof HTMLElement && now.dataset.editKey === editKey)
              return;
            onEnd(text);
          });
        }}
      />
      <div id={feedbackId} aria-live="polite" className="text-xs">
        {recognition.status === "error" ? (
          <span className="text-warning">
            Couldn’t highlight this ingredient. Your text will still be saved.
          </span>
        ) : (
          <span className="sr-only">
            {ranges
              .map(
                (range) =>
                  `${range.type}: ${value.slice(range.start, range.end)}`,
              )
              .join(". ")}
          </span>
        )}
      </div>
    </div>
  );
}
