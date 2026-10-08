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
  canMove(itemId: string): boolean;
  readonly dragged: DraggedItem | null;
  setDragged(item: DraggedItem | null): void;
};

const DragSessionContext = createContext<DragSessionValue>({
  dragType: "",
  canMove: () => false,
  dragged: null,
  setDragged: () => {},
});

type DragSessionProps = PropsWithChildren<{
  dragType: string;
  canMove(itemId: string): boolean;
}>;

/** I hold one view's drag: what's being dragged, and whether it may be. */
export function DragSession({ dragType, canMove, children }: DragSessionProps) {
  const [dragged, setDragged] = useState<DraggedItem | null>(null);
  return (
    <DragSessionContext value={{ dragType, canMove, dragged, setDragged }}>
      {children}
    </DragSessionContext>
  );
}

/** I give the session I'm inside. Outside any, nothing can be moved. */
export function useDragSession(): DragSessionValue {
  return useContext(DragSessionContext);
}
