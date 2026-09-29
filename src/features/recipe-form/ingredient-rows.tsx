"use client";

import { focusAtEnd } from "@/features/morsel/editor-dom";
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
  chooseIngredient,
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
import type { RecognitionQueue } from "./recognition-queue";

type IngredientRowsProps = {
  labelPrefix?: string;
  rows: IngredientDraft[];
  onChange: (
    rows: SetStateAction<IngredientDraft[]>,
    source?: "edit" | "recognition",
  ) => void;
  recognize: RecognizeIngredient;
  isDisabled: boolean;
  queue: RecognitionQueue;
};

export function IngredientRows({
  labelPrefix = "Ingredient",
  rows,
  onChange,
  isDisabled,
  recognize,
  queue,
}: IngredientRowsProps) {
  const helpId = useId();
  const [pasted, setPasted] = useState(new Map<string, { raw: string }>());
  const inputs = useRef(new Map<string, HTMLDivElement>());
  const pendingFocus = useRef<string | undefined>(undefined);

  useLayoutEffect(() => {
    const clientId = pendingFocus.current;
    if (clientId === undefined) {
      return;
    }
    const input = inputs.current.get(clientId);
    if (input) focusAtEnd(input);
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
              label={`${labelPrefix} ${index + 1}`}
              helpId={helpId}
              isDisabled={isDisabled}
              pastedRow={pasted.get(row.clientId)}
              recognize={recognize}
              queue={queue}
              onChange={(raw, choice) =>
                onChange((current) =>
                  updateIngredient(current, row.clientId, raw, choice),
                )
              }
              onChoose={(raw, choice) =>
                onChange((current) =>
                  chooseIngredient(current, row.clientId, raw, choice),
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
              onEnter={() => addRow(index + 1)}
              onKeyDown={(event) => {
                if (
                  event.nativeEvent.isComposing ||
                  event.nativeEvent.keyCode === 229
                ) {
                  return;
                }
                if (
                  (event.key === "Backspace" || event.key === "Delete") &&
                  row.raw.trim().length === 0
                ) {
                  event.preventDefault();
                  removeRow(index);
                }
              }}
              onPasteLines={(text, selection) => {
                if (!/[\r\n]/.test(text)) {
                  return false;
                }
                const lines = pasteIngredientLines(
                  row.raw,
                  text,
                  selection.start,
                  selection.end,
                );
                if (lines.length === 0) {
                  return true;
                }
                const pastedRows = lines.map((raw, lineIndex) =>
                  lineIndex === 0
                    ? { clientId: row.clientId, raw }
                    : newIngredientDraft(raw),
                );
                setPasted(
                  new Map(pastedRows.map((item) => [item.clientId, item])),
                );
                changeAndFocus(
                  [
                    ...rows.slice(0, index),
                    ...pastedRows,
                    ...rows.slice(index + 1),
                  ],
                  pastedRows[pastedRows.length - 1].clientId,
                );
                return true;
              }}
            />
            <Button
              aria-label={`Move ${labelPrefix.toLowerCase()} ${index + 1} up`}
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
              aria-label={`Move ${labelPrefix.toLowerCase()} ${index + 1} down`}
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
              aria-label={`Remove ${labelPrefix.toLowerCase()} ${index + 1}`}
              isIconOnly
              isDisabled={isDisabled}
              onPress={() => removeRow(index)}
              type="button"
              variant="tertiary"
            >
              <X aria-hidden="true" size={16} />
            </Button>
            <Button
              aria-label={`Add ${labelPrefix.toLowerCase()} below ${index + 1}`}
              isIconOnly
              isDisabled={isDisabled}
              onPress={() => addRow(index + 1)}
              type="button"
              variant="tertiary"
            >
              <Plus aria-hidden="true" size={16} />
            </Button>
          </li>
        ))}
      </ol>
    </fieldset>
  );
}
