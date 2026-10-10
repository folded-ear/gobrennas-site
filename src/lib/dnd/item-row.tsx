"use client";

import clsx from "clsx";
import { PropsWithChildren } from "react";
import { DragHandle } from "./drag-handle";
import { useDragSession } from "./drag-session";
import { ZoneLayer, ZoneSpec } from "./zone-layer";

type ItemRowProps = PropsWithChildren<{
  itemId: string;
  name: string;
  zones: readonly ZoneSpec[];
  /**
   * How my handle shows: "disabled" never drags, and "placeholder" only
   * takes a handle's room. Left out, it drags.
   */
  handle?: "disabled" | "placeholder";
  /** Spacing inside my box, which my drop zones cover. */
  className?: string;
}>;

/**
 * I am one item's line: a handle on my left edge when my item can be
 * moved, then my content, with whatever drop zones I'm given laid over the
 * top.
 */
export function ItemRow({
  itemId,
  name,
  zones,
  handle,
  className,
  children,
}: ItemRowProps) {
  const { canMove, dragged } = useDragSession();
  return (
    <div
      className={clsx(
        "relative flex items-start gap-xxs",
        dragged?.id === itemId && "opacity-40",
        className,
      )}
    >
      {!canMove(itemId) ? null : handle === "placeholder" ? (
        <span aria-hidden className="item-button" />
      ) : (
        <DragHandle
          itemId={itemId}
          name={name}
          isFixed={handle === "disabled"}
        />
      )}
      {children}
      <ZoneLayer zones={zones} />
    </div>
  );
}
