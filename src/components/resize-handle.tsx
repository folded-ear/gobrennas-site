"use client";

import { useMove } from "react-aria";

/** How far one arrow key press moves the divider. */
const KEYBOARD_STEP = 16;

type ResizeHandleProps = {
  /** Which edge of the panel I sit on. */
  side: "left" | "right";
  width: number;
  minWidth: number;
  maxWidth: number;
  onWidthChange: (width: number) => void;
  /** Names me for assistive technology, e.g. "Resize sidebar". */
  label: string;
};

export function ResizeHandle({
  side,
  width,
  minWidth,
  maxWidth,
  onWidthChange,
  label,
}: ResizeHandleProps) {
  const { moveProps } = useMove({
    onMove(e) {
      const step = e.pointerType === "keyboard" ? KEYBOARD_STEP : 1;
      const towardWider = side === "left" ? -e.deltaX : e.deltaX;
      const next = width + towardWider * step;
      onWidthChange(Math.min(maxWidth, Math.max(minWidth, next)));
    },
  });

  return (
    // z-10 clears any positioned sibling, such as a ScrollShadow, that would
    // otherwise paint over me and swallow the drag
    <div
      {...moveProps}
      role="separator"
      tabIndex={0}
      aria-label={label}
      aria-orientation="vertical"
      aria-valuenow={width}
      aria-valuemin={minWidth}
      aria-valuemax={maxWidth}
      className={`group absolute top-0 z-10 h-full w-2 cursor-col-resize touch-none outline-none ${
        side === "left" ? "-left-1" : "-right-1"
      }`}
    >
      <div className="mx-auto h-full w-px group-hover:bg-accent group-active:bg-accent group-focus-visible:bg-accent" />
    </div>
  );
}
