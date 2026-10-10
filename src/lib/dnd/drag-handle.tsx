"use client";

import { DragHandleIcon } from "@/components/icons";
import { displayName } from "@/lib/plan-item-name";
import { useRef } from "react";
import {
  DragPreview,
  DragPreviewRenderer,
  mergeProps,
  useDrag,
  usePress,
} from "react-aria";
import { useDragSession } from "./drag-session";

type DragHandleProps = {
  itemId: string;
  name: string;
  /** Whether my item stays put, so I show but never start a drag. */
  isFixed?: boolean;
};

const MOVE_ONLY = ["move" as const];

/**
 * I start dragging my item, by pointer, touch, or Enter or Space from the
 * keyboard.
 */
export function DragHandle({ itemId, name, isFixed = false }: DragHandleProps) {
  const { dragType, setDragged } = useDragSession();
  const preview = useRef<DragPreviewRenderer>(null);
  // With its own drag button, useDrag leaves pointer presses alone; left to
  // guess, it takes a press dead centre for a screen reader's.
  const { dragProps, dragButtonProps } = useDrag({
    hasDragButton: true,
    getItems: () => [{ [dragType]: itemId }],
    getAllowedDropOperations: () => MOVE_ONLY,
    preview,
    isDisabled: isFixed,
    onDragStart: () => setDragged({ id: itemId, name }),
    onDragEnd: () => setDragged(null),
  });
  const { onPress, ...descriptionProps } = dragButtonProps;
  const { pressProps } = usePress({ onPress, isDisabled: isFixed });

  return (
    <>
      <button
        type="button"
        aria-label={`Move ${displayName(name)}`}
        aria-disabled={isFixed || undefined}
        {...mergeProps(dragProps, descriptionProps, pressProps)}
        className="item-button cursor-grab touch-none text-muted hover:text-foreground aria-disabled:cursor-default aria-disabled:opacity-40"
      >
        <DragHandleIcon />
      </button>
      <DragPreview ref={preview}>
        {() => (
          <div className="rounded-sm bg-overlay px-sm py-xs text-sm text-foreground shadow-md">
            {displayName(name)}
          </div>
        )}
      </DragPreview>
    </>
  );
}
