"use client";

import { useEffect, useRef } from "react";
import { DropOperation, useDrop } from "react-aria";
import { useDragSession } from "./drag-session";
import { ZoneRect, zoneStyle } from "./zones";

type DropZoneProps = {
  rect: ZoneRect;
  label: string;
  onDrop(): void;
  /** I say whether a drag is over or focused on me right now. */
  onTargetChange?(isTarget: boolean): void;
};

/**
 * I am one place on a row where a drag from my own view can land. I lie
 * over the row without taking up room in it.
 */
export function DropZone({
  rect,
  label,
  onDrop,
  onTargetChange,
}: DropZoneProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { dragType } = useDragSession();
  const { dropProps, isDropTarget } = useDrop({
    ref,
    getDropOperation: (types): DropOperation =>
      types.has(dragType) ? "move" : "cancel",
    onDrop: () => onDrop(),
  });

  useEffect(() => {
    onTargetChange?.(isDropTarget);
  }, [isDropTarget, onTargetChange]);

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      aria-label={label}
      {...dropProps}
      className="absolute z-10 outline-none"
      style={zoneStyle(rect)}
    />
  );
}
