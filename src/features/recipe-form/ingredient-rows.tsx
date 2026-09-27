"use client";

import { Button } from "@heroui/react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type SetStateAction,
} from "react";
import {
  insertIngredient,
  moveIngredient,
  newIngredientDraft,
  pasteIngredientLines,
  removeIngredient,
  updateIngredient,
  type IngredientDraft,
} from "./ingredient-draft";

import { IngredientInput } from "./ingredient-input";
import type { RecognizeIngredient } from "./ingredient-recognition";
import { createRecognitionQueue } from "./recognition-queue";

type IngredientRowsProps = {
  rows: IngredientDraft[];
  onChange: (
    rows: SetStateAction<IngredientDraft[]>,
    source?: "edit" | "recognition",
  ) => void;
  recognize: RecognizeIngredient;
  isDisabled: boolean;
};

export function IngredientRows({
  rows,
  onChange,
  isDisabled,
  recognize,
}: IngredientRowsProps) {
  const helpId = useId();
  const [queue] = useState(createRecognitionQueue);
  const inputs = useRef(new Map<string, HTMLInputElement>());
  const pendingFocus = useRef<string | undefined>(undefined);

  useLayoutEffect(() => {
    const clientId = pendingFocus.current;
    if (clientId === undefined) {
      return;
    }
    const input = inputs.current.get(clientId);
    input?.focus();
    input?.setSelectionRange(input.value.length, input.value.length);
    pendingFocus.current = undefined;
  }, [rows]);

  function changeAndFocus(nextRows: IngredientDraft[], clientId: string): void {
    pendingFocus.current = clientId;
    onChange(nextRows);
  }

  function addRow(index: number): void {
    const row = newIngredientDraft();
    changeAndFocus(insertIngredient(rows, index, row), row.clientId);
  }

  function removeRow(index: number): void {
    const remaining = removeIngredient(rows, rows[index].clientId);
    if (remaining.length === 0) {
      const placeholder = newIngredientDraft();
      changeAndFocus([placeholder], placeholder.clientId);
      return;
    }
    const neighbor = remaining[Math.max(0, index - 1)];
    changeAndFocus(remaining, neighbor.clientId);
  }

  return (
    <fieldset className="flex min-w-0 flex-col gap-sm" disabled={isDisabled}>
      <legend className="mb-sm font-medium">Ingredients</legend>
      <p className="text-sm text-muted" id={helpId}>
        Enter one ingredient per row. Press Enter to add another, or paste a
        list.
      </p>
      <ol className="flex flex-col gap-sm">
        {rows.map((row, index) => (
          <li className="flex items-start gap-xs" key={row.clientId}>
            <IngredientInput
              row={row}
              number={index + 1}
              helpId={helpId}
              isDisabled={isDisabled}
              recognize={recognize}
              queue={queue}
              onChange={(raw) =>
                onChange((current) =>
                  updateIngredient(current, row.clientId, raw),
                )
              }
              onRecognized={(recognition) =>
                onChange(
                  (current) =>
                    current.map((item) =>
                      item.clientId === row.clientId &&
                      item.raw === recognition.raw
                        ? { ...item, recognition }
                        : item,
                    ),
                  "recognition",
                )
              }
              inputRef={(input) => {
                if (input) inputs.current.set(row.clientId, input);
                else inputs.current.delete(row.clientId);
              }}
              onKeyDown={(event) => {
                if (
                  event.nativeEvent.isComposing ||
                  event.nativeEvent.keyCode === 229
                ) {
                  return;
                }
                if (event.key === "Enter") {
                  event.preventDefault();
                  addRow(index + 1);
                } else if (
                  (event.key === "Backspace" || event.key === "Delete") &&
                  row.raw.trim().length === 0
                ) {
                  event.preventDefault();
                  removeRow(index);
                }
              }}
              onPaste={(event) => {
                const text = event.clipboardData.getData("text/plain");
                if (!/[\r\n]/.test(text)) {
                  return;
                }
                event.preventDefault();
                const input = event.currentTarget;
                const lines = pasteIngredientLines(
                  row.raw,
                  text,
                  input.selectionStart ?? row.raw.length,
                  input.selectionEnd ?? row.raw.length,
                );
                if (lines.length === 0) {
                  return;
                }
                const pastedRows = lines.map((raw, lineIndex) =>
                  lineIndex === 0
                    ? { clientId: row.clientId, raw }
                    : newIngredientDraft(raw),
                );
                changeAndFocus(
                  [
                    ...rows.slice(0, index),
                    ...pastedRows,
                    ...rows.slice(index + 1),
                  ],
                  pastedRows[pastedRows.length - 1].clientId,
                );
              }}
            />
            <Button
              aria-label={`Move ingredient ${index + 1} up`}
              isIconOnly
              isDisabled={isDisabled || index === 0}
              onPress={() =>
                changeAndFocus(
                  moveIngredient(rows, row.clientId, -1),
                  row.clientId,
                )
              }
              type="button"
              variant="tertiary"
            >
              <ArrowUp aria-hidden="true" size={16} />
            </Button>
            <Button
              aria-label={`Move ingredient ${index + 1} down`}
              isIconOnly
              isDisabled={isDisabled || index === rows.length - 1}
              onPress={() =>
                changeAndFocus(
                  moveIngredient(rows, row.clientId, 1),
                  row.clientId,
                )
              }
              type="button"
              variant="tertiary"
            >
              <ArrowDown aria-hidden="true" size={16} />
            </Button>
            <Button
              aria-label={`Remove ingredient ${index + 1}`}
              isIconOnly
              isDisabled={isDisabled}
              onPress={() => removeRow(index)}
              type="button"
              variant="tertiary"
            >
              <X aria-hidden="true" size={16} />
            </Button>
          </li>
        ))}
      </ol>
      <Button
        className="self-start"
        isDisabled={isDisabled}
        onPress={() => addRow(rows.length)}
        type="button"
        variant="secondary"
      >
        <Plus aria-hidden="true" size={16} /> Add ingredient
      </Button>
    </fieldset>
  );
}
