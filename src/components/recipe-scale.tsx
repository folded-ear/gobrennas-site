"use client";

import { Button, ButtonGroup } from "@heroui/react";

const PRESETS = [
  [0.25, "¼×"],
  [0.5, "½×"],
  [1, "1×"],
  [2, "2×"],
] as const;

/** The same batch chooser for adding recipes and editing a plan. */
export function RecipeScale({
  value,
  onChange,
  isDisabled = false,
  readOnlyCustomValue = false,
}: {
  value: number;
  onChange: (value: number) => void;
  isDisabled?: boolean;
  /** Saved non-preset scales are edited inline in the planner, not here. */
  readOnlyCustomValue?: boolean;
}) {
  const isReadOnly =
    readOnlyCustomValue && !PRESETS.some(([scale]) => scale === value);
  return (
    <div className="flex items-center gap-sm">
      <span className="text-sm text-muted">
        {isReadOnly ? `${value} scale` : "scale"}
      </span>
      <ButtonGroup size="sm" aria-label="Recipe scale">
        {PRESETS.map(([scale, label]) => (
          <Button
            key={scale}
            variant={value === scale ? "primary" : "secondary"}
            aria-pressed={value === scale}
            isDisabled={isDisabled || isReadOnly}
            onPress={() => onChange(scale)}
          >
            {label}
          </Button>
        ))}
      </ButtonGroup>
    </div>
  );
}
