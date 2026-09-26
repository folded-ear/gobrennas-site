"use client";

import { useDroppable } from "@dnd-kit/core";
import { useEffect, useId } from "react";
import { ZoneData } from "./drag-session";
import { ZoneRect, zoneStyle } from "./zones";

type DropZoneProps = {
  rect: ZoneRect;
  label: string;
  onDrop(): void;
  /** I say whether a drag is over me right now. */
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
  const id = useId();
  const data: ZoneData = { label, onDrop };
  const { setNodeRef, isOver } = useDroppable({ id, data });

  useEffect(() => {
    onTargetChange?.(isOver);
  }, [isOver, onTargetChange]);

  return (
    <div
      ref={setNodeRef}
      data-drop-zone={label}
      className="absolute z-10"
      style={zoneStyle(rect)}
    />
  );
}
