"use client";

import { DragHandleIcon } from "@/components/icons";
import { displayName } from "@/lib/plan-item-name";
import { useDraggable } from "@dnd-kit/core";
import { useDragSession } from "./drag-session";

type DragHandleProps = {
  itemId: string;
  name: string;
  /** Whether my item stays put, so I show but never start a drag. */
  isFixed?: boolean;
};

/**
 * I start dragging my item, by pointer, touch, or Enter or Space from the
 * keyboard.
 */
export function DragHandle({ itemId, name, isFixed = false }: DragHandleProps) {
  const { isMoving } = useDragSession();
  const disabled = isMoving(itemId) || isFixed;
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: itemId,
    data: { name },
    disabled,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      aria-label={`Move ${displayName(name)}`}
      aria-disabled={disabled || undefined}
      className="flex size-xl shrink-0 cursor-grab touch-none items-center justify-center rounded-xs text-muted hover:text-foreground aria-disabled:cursor-default aria-disabled:opacity-40"
    >
      <DragHandleIcon size="small" />
    </button>
  );
}
