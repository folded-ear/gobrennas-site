"use client";

import { useBlockScreenEscape } from "@/components/screen";
import {
  Active,
  Announcements,
  CollisionDetection,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  Over,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useId,
  useState,
} from "react";

/** How far, in pixels, a pressed handle must move before a drag starts. */
export const ACTIVATION_DISTANCE = 3;

/** The item a drag is carrying. */
export type DraggedItem = {
  readonly id: string;
  readonly name: string;
};

/** What a drop zone carries for the drag that lands on it. */
export type ZoneData = {
  readonly label: string;
  onDrop(): void;
};

type DragSessionValue = {
  canMove(itemId: string): boolean;
  readonly dragged: DraggedItem | null;
  isMoving(itemId: string): boolean;
};

const DragSessionContext = createContext<DragSessionValue>({
  canMove: () => false,
  dragged: null,
  isMoving: () => false,
});

function nameOf(active: Active): string {
  return (active.data.current as { name: string }).name;
}

function zoneOf(over: Over | null): ZoneData | undefined {
  return over?.data.current as ZoneData | undefined;
}

// A pointer drag lands under the pointer; a keyboard drag has none.
const detectCollisions: CollisionDetection = (args) =>
  args.pointerCoordinates ? pointerWithin(args) : rectIntersection(args);

const ANNOUNCEMENTS: Announcements = {
  onDragStart: ({ active }) => `Picked up ${nameOf(active)}.`,
  onDragOver: ({ active, over }) => {
    const zone = zoneOf(over);
    return zone ? `${zone.label}.` : `${nameOf(active)} can't go here.`;
  },
  onDragEnd: ({ active, over }) =>
    zoneOf(over)
      ? `Dropped ${nameOf(active)}.`
      : `Dropped ${nameOf(active)} where it was.`,
  onDragCancel: ({ active }) => `Stopped moving ${nameOf(active)}.`,
};

type DragSessionProps = PropsWithChildren<{
  canMove(itemId: string): boolean;
  isMoving(itemId: string): boolean;
}>;

/**
 * I hold one view's drag: what's being dragged, whether it may be, and
 * where it lands. Drags never cross from one session to another.
 */
export function DragSession({ canMove, isMoving, children }: DragSessionProps) {
  const id = useId();
  const [dragged, setDragged] = useState<DraggedItem | null>(null);
  useBlockScreenEscape(dragged !== null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: ACTIVATION_DISTANCE },
    }),
    useSensor(KeyboardSensor),
  );

  function handleDragStart({ active }: DragStartEvent) {
    setDragged({ id: String(active.id), name: nameOf(active) });
  }

  function handleDragEnd({ over }: DragEndEvent) {
    setDragged(null);
    zoneOf(over)?.onDrop();
  }

  return (
    <DragSessionContext value={{ canMove, dragged, isMoving }}>
      <DndContext
        id={id}
        sensors={sensors}
        collisionDetection={detectCollisions}
        accessibility={{ announcements: ANNOUNCEMENTS }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setDragged(null)}
      >
        {children}
        <DragOverlay dropAnimation={null}>
          {dragged ? (
            <div className="w-max rounded-sm bg-overlay px-sm py-xs text-sm text-foreground shadow-md">
              {dragged.name}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </DragSessionContext>
  );
}

/** I give the session I'm inside. Outside any, nothing can be moved. */
export function useDragSession(): DragSessionValue {
  return useContext(DragSessionContext);
}
