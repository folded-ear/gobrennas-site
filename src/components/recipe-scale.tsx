"use client";

import { Button, ButtonGroup } from "@heroui/react";

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
  return (
    <ButtonGroup size="sm" aria-label="Recipe scale">
      {PRESETS.map(([scale, label]) => (
        <Button
          key={scale}
          variant={value === scale ? "primary" : "secondary"}
          aria-pressed={value === scale}
          isDisabled={isDisabled}
          onPress={() => onChange(scale)}
        >
          {label}
        </Button>
      ))}
    </ButtonGroup>
  );
}
