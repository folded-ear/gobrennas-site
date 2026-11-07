"use client";

import { Button, Input, Label, TextField } from "@heroui/react";
import { useId, useState } from "react";

const PRESETS = [
  [0.25, "¼×"],
  [0.5, "½×"],
  [1, "1×"],
  [2, "2×"],
] as const;

/** The same batch chooser for adding, editing a plan, and temporary cooking display. */
export function RecipeScale({
  value,
  onChange,
  isDisabled = false,
}: {
  value: number;
  onChange: (value: number) => void;
  isDisabled?: boolean;
}) {
  const [custom, setDraft] = useState<string | null>(null);
  const draft = custom ?? String(value);
  const errorId = useId();
  const number = Number(draft);
  const valid = draft.trim() !== "" && Number.isFinite(number) && number > 0;
  return (
    <div
      className="flex flex-wrap items-end gap-sm"
      role="group"
      aria-label="Recipe scale"
    >
      {PRESETS.map(([scale, label]) => (
        <Button
          key={scale}
          size="sm"
          variant={value === scale ? "primary" : "secondary"}
          aria-pressed={value === scale}
          isDisabled={isDisabled}
          onPress={() => {
            setDraft(null);
            onChange(scale);
          }}
        >
          {label}
        </Button>
      ))}
      <TextField
        value={draft}
        onChange={setDraft}
        isDisabled={isDisabled}
        isInvalid={!valid}
        className="w-28"
      >
        <Label>Custom multiplier</Label>
        <Input
          inputMode="decimal"
          aria-describedby={!valid ? errorId : undefined}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            event.stopPropagation();
            if (valid && !isDisabled) {
              onChange(number);
              setDraft(null);
            }
          }}
        />
      </TextField>
      <Button
        size="sm"
        isDisabled={isDisabled || !valid || number === value}
        onPress={() => {
          onChange(number);
          setDraft(null);
        }}
      >
        Apply scale
      </Button>
      {!valid ? (
        <p id={errorId} role="alert" className="text-sm text-danger">
          Enter a number greater than zero.
        </p>
      ) : null}
    </div>
  );
}
