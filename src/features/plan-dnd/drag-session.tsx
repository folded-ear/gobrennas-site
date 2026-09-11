"use client";

import { createContext, PropsWithChildren, useContext, useState } from "react";

/** The item a drag is carrying. */
export type DraggedItem = {
  readonly id: string;
  readonly name: string;
};

type DragSessionValue = {
  /** Marks a drag as belonging to this view, so other views ignore it. */
  readonly dragType: string;
  readonly canMove: boolean;
  readonly dragged: DraggedItem | null;
  setDragged(item: DraggedItem | null): void;
  isMoving(itemId: string): boolean;
};

const DragSessionContext = createContext<DragSessionValue>({
  dragType: "",
  canMove: false,
  dragged: null,
  setDragged: () => {},
  isMoving: () => false,
});

type DragSessionProps = PropsWithChildren<{
  dragType: string;
  canMove: boolean;
  isMoving(itemId: string): boolean;
}>;

/** I hold one view's drag: what's being dragged, and whether it may be. */
export function DragSession({
  dragType,
  canMove,
  isMoving,
  children,
}: DragSessionProps) {
  const [dragged, setDragged] = useState<DraggedItem | null>(null);
  return (
    <DragSessionContext
      value={{ dragType, canMove, dragged, setDragged, isMoving }}
    >
      {children}
    </DragSessionContext>
  );
}

/** Outside any session nothing can be moved, so nothing offers to be. */
export function useDragSession(): DragSessionValue {
  return useContext(DragSessionContext);
}
