"use client";

import { DragHandleIcon } from "@/components/icons";
import { useRef } from "react";
import { DragPreview, DragPreviewRenderer, useDrag } from "react-aria";
import { useDragSession } from "./drag-session";

type DragHandleProps = {
  itemId: string;
  name: string;
};

const MOVE_ONLY = ["move" as const];

/** I start dragging my item, by pointer, touch, or Enter from the keyboard. */
export function DragHandle({ itemId, name }: DragHandleProps) {
  const { dragType, dragged, isMoving, setDragged } = useDragSession();
  const preview = useRef<DragPreviewRenderer>(null);
  // A drop starts the move before the drag ends, and a disabled useDrag
  // drops its dragend handler, so the drag under way must stay endable.
  const moving = isMoving(itemId) && dragged?.id !== itemId;
  const { dragProps } = useDrag({
    getItems: () => [{ [dragType]: itemId }],
    getAllowedDropOperations: () => MOVE_ONLY,
    preview,
    isDisabled: moving,
    onDragStart: () => setDragged({ id: itemId, name }),
    onDragEnd: () => setDragged(null),
  });

  return (
    <>
      <button
        type="button"
        aria-label={`Move ${name}`}
        aria-disabled={moving || undefined}
        {...dragProps}
        className="flex size-xl shrink-0 cursor-grab touch-none items-center justify-center rounded-xs text-muted hover:text-foreground aria-disabled:cursor-default aria-disabled:opacity-40"
      >
        <DragHandleIcon size="small" />
      </button>
      <DragPreview ref={preview}>
        {() => (
          <div className="rounded-sm bg-overlay px-sm py-xs text-sm text-foreground shadow-md">
            {name}
          </div>
        )}
      </DragPreview>
    </>
  );
}
