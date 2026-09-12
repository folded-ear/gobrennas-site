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
}>;

/**
 * I am one item's line: a handle on my left edge when items can be moved,
 * then my content, with whatever drop zones I'm given laid over the top.
 */
export function ItemRow({ itemId, name, zones, children }: ItemRowProps) {
  const { canMove, dragged } = useDragSession();
  return (
    <div
      className={clsx(
        "relative flex items-center gap-xxs",
        dragged?.id === itemId && "opacity-40",
      )}
    >
      {canMove ? <DragHandle itemId={itemId} name={name} /> : null}
      {children}
      <ZoneLayer zones={zones} />
    </div>
  );
}
