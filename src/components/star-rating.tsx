"use client";

import { RatingIcon } from "@/components/icons";
import { Radio, RadioGroup } from "@heroui/react";
import { useState } from "react";

export const MAX_RATING = 5;

const STARS = Array.from({ length: MAX_RATING }, (_, i) => i + 1);

const starName = (n: number) => (n === 1 ? "1 star" : `${n} stars`);

type StarRatingProps = {
  /** Whole stars, 1 through {@link MAX_RATING}; null when unrated. */
  value: number | null;
  onChange?: (value: number) => void;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  "aria-label": string;
};

/**
 * I show a rating as stars, lit through the chosen one, and let a person
 * choose another. Once chosen, a rating can't be cleared.
 */
export function StarRating({
  value,
  onChange,
  isDisabled = false,
  isReadOnly = false,
  "aria-label": ariaLabel,
}: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const previewing = !isDisabled && !isReadOnly;
  const litThrough = (previewing ? hovered : null) ?? value ?? 0;
  return (
    <RadioGroup
      aria-label={ariaLabel}
      orientation="horizontal"
      value={value === null ? null : String(value)}
      onChange={(chosen) => onChange?.(Number(chosen))}
      isDisabled={isDisabled}
      isReadOnly={isReadOnly}
      // Stars abut, so the pointer is always over one while crossing them.
      className="gap-0"
    >
      {STARS.map((n) => (
        <Radio
          key={n}
          value={String(n)}
          className={isReadOnly ? "cursor-default" : undefined}
        >
          <Radio.Content
            data-lit={n <= litThrough}
            onHoverStart={() => setHovered(n)}
            onHoverEnd={() => setHovered((h) => (h === n ? null : h))}
            className="group rounded-sm px-px data-[focus-visible=true]:outline-2 data-[focus-visible=true]:outline-offset-2 data-[focus-visible=true]:outline-accent"
          >
            <RatingIcon
              aria-hidden
              className="text-muted group-data-[lit=true]:fill-accent group-data-[lit=true]:text-accent"
            />
            <span className="sr-only">{starName(n)}</span>
          </Radio.Content>
        </Radio>
      ))}
    </RadioGroup>
  );
}
