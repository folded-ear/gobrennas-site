"use client";

import clsx from "clsx";
import { PropsWithChildren, ReactNode } from "react";
import { DragHandle } from "./drag-handle";
import { useDragSession } from "./drag-session";
import { ZoneLayer, ZoneSpec } from "./zone-layer";

type ItemRowProps = PropsWithChildren<{
  itemId: string;
  name: string;
  zones: readonly ZoneSpec[];
  /** What leads my line. Left out, a handle when my item can be moved. */
  lead?: ReactNode;
}>;

/**
 * I am one item's line: whatever leads it on my left edge, a handle by
 * default when my item can be moved, then my content, with whatever drop
 * zones I'm given laid over the top.
 */
export function ItemRow({ itemId, name, zones, lead, children }: ItemRowProps) {
  const { canMove, dragged } = useDragSession();
  return (
    <div
      className={clsx(
        "relative flex items-start gap-xxs",
        dragged?.id === itemId && "opacity-40",
      )}
    >
      {lead !== undefined ? (
        lead
      ) : canMove(itemId) ? (
        <DragHandle itemId={itemId} name={name} />
      ) : null}
      {children}
      <ZoneLayer zones={zones} />
    </div>
  );
}
