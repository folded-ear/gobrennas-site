"use client";

import clsx from "clsx";
import { useLayoutEffect } from "react";
import { Draft, keyString } from "./drafts";
import { ItemNameEditor } from "./item-name-editor";
import { rowKeymap } from "./keymap";
import { useEditSurface } from "./surface";

type DraftRowProps = {
  readonly draft: Draft;
  readonly className?: string;
};

const NEW_ITEM = "New item";

/**
 * I am a new item's name, edited as any row is. Once committed, the item
 * shows in my place, under my draft id.
 */
export function DraftRow({ draft, className }: DraftRowProps) {
  const surface = useEditSurface();
  const key = { draftId: draft.draftId };

  useLayoutEffect(() => {
    surface?.register(
      { draftId: draft.draftId },
      {
        editable: true,
        initialText: "",
        commit: (text) => surface.commitDraft(draft, text),
      },
    );
  });

  if (surface === null) return null;

  if (surface.isEditing(key)) {
    return (
      <span className={clsx("flex min-w-0 flex-1", className)}>
        <ItemNameEditor
          initialText={surface.resumeText() ?? ""}
          caret={surface.caret}
          keymap={rowKeymap({
            split: (atStart) =>
              surface.split(key, atStart, {
                planId: draft.planId,
                bucketId: draft.bucketId,
                group: draft.group,
              }),
            remove: (direction) => surface.remove(key, direction),
            cancel: () => surface.cancel(key),
            hasChildren: false,
          })}
          label={NEW_ITEM}
          editKey={keyString(key)}
          onChange={surface.setText}
          onEnd={() => surface.end(key)}
        />
      </span>
    );
  }

  return null;
}
