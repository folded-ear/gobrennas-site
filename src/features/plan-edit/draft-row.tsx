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
 * I am a new item's name: edited as any row is, then faded while its
 * create is sent. Pressed while saving, it's edited once created.
 */
export function DraftRow({ draft, className }: DraftRowProps) {
  const surface = useEditSurface();
  const key = { draftId: draft.draftId };

  useLayoutEffect(() => {
    surface?.register(
      { draftId: draft.draftId },
      {
        editable: true,
        initialText: draft.text,
        commit: (text) => surface.commitDraft(draft, text),
      },
    );
  });

  if (surface === null) return null;

  if (draft.state === "editing" && surface.isEditing(key)) {
    return (
      <span
        className={clsx(
          "flex min-w-0 flex-1 rounded-xs bg-editing text-editing-foreground",
          className,
        )}
      >
        <ItemNameEditor
          initialText={surface.resumeText() ?? draft.text}
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

  return (
    <span
      className={clsx("flex min-w-0 flex-1 cursor-text", className)}
      onClick={() => surface.start(key)}
    >
      <span
        aria-busy={draft.state === "saving"}
        className={clsx(draft.state === "saving" && "opacity-60")}
      >
        {draft.text}
      </span>
    </span>
  );
}
