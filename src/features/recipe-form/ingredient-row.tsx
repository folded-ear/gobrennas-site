"use client";

import { FieldError, Input, TextField } from "@heroui/react";
import { ClipboardEvent, KeyboardEvent } from "react";

/**
 * One ingredient. Deliberately raw-text-only for now — server-side
 * recognition (quantity/unit/ingredient parsing plus suggestions) will live
 * behind this same interface, so it can land without the draft layer above
 * knowing anything changed.
 */
type IngredientRowProps = {
  name: string;
  label: string;
  value: string;
  placeholder?: string;
  onChange: (raw: string) => void;
  onPressEnter: () => void;
  onDelete: () => void;
  onMultilinePaste: (text: string) => void;
};

export function IngredientRow({
  name,
  label,
  value,
  placeholder,
  onChange,
  onPressEnter,
  onDelete,
  onMultilinePaste,
}: IngredientRowProps) {
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      onPressEnter();
    } else if (
      (e.key === "Backspace" || e.key === "Delete") &&
      value.length === 0
    ) {
      e.preventDefault();
      onDelete();
    }
  }

  function handlePaste(e: ClipboardEvent) {
    const text = e.clipboardData.getData("text");
    if (!text.trim().includes("\n")) return;
    e.preventDefault();
    onMultilinePaste(text);
  }

  return (
    <TextField
      name={name}
      aria-label={label}
      value={value}
      onChange={onChange}
      className="flex-1"
    >
      <Input
        placeholder={placeholder}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
      />
      <FieldError />
    </TextField>
  );
}
