"use client";

import clsx from "clsx";
import { PropsWithChildren } from "react";
import { DragHandle } from "./drag-handle";
import { useDragSession } from "./drag-session";
import { ZoneLayer, ZoneSpec } from "./zone-layer";

type ItemRowProps = PropsWithChildren<
  {
    /** Spacing inside my box, which my drop zones cover. */
    className?: string;
  } & (
    | {
        itemId: string;
        name: string;
        /** Where a dragged item can land on my line. */
        zones?: readonly ZoneSpec[];
        /**
         * How my handle shows: "disabled" never drags, and "placeholder"
         * only takes a handle's room. Left out, it drags.
         */
        handle?: "disabled" | "placeholder";
      }
    | {
        /** With no item, a handle's room is all I can lead with. */
        handle: "placeholder";
      }
  )
>;

/**
 * I am one line: a handle on my left edge when my item can be moved, then
 * my content, with whatever drop zones I'm given laid over the top. With no
 * item, I leave a handle's room and take no drops.
 */
export function ItemRow(props: ItemRowProps) {
  const { canMove, dragged } = useDragSession();
  const { handle, className, children } = props;
  const item = "itemId" in props ? props : null;
  const movable = item !== null && canMove(item.itemId);
  return (
    <div
      className={clsx(
        "relative flex items-center gap-xxs",
        item !== null && dragged?.id === item.itemId && "opacity-40",
        className,
      )}
    >
      {item === null || (movable && handle === "placeholder") ? (
        <span aria-hidden className="item-button" />
      ) : movable ? (
        <DragHandle
          itemId={item.itemId}
          name={item.name}
          isFixed={handle === "disabled"}
        />
      ) : null}
      {children}
      {item !== null ? <ZoneLayer zones={item.zones ?? []} /> : null}
    </div>
  );
}
