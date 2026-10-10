"use client";

import { displayName } from "@/lib/plan-item-name";
import clsx from "clsx";
import { ReactNode, useEffect, useLayoutEffect, useRef } from "react";
import { keyString } from "./drafts";
import { IngredientNameEditor } from "./ingredient-name-editor";
import { ItemNameEditor } from "./item-name-editor";
import { headingKeymap, RowActions, rowKeymap } from "./keymap";
import { useEditSurface } from "./surface";

type EditableNameProps = {
  readonly itemId: string;
  readonly planId: string;
  /** The name as saved, which an edit starts from. */
  readonly name: string;
  readonly hasChildren: boolean;
  /** Whether the viewer may edit the item now. */
  readonly canEdit: boolean;
  /** Highlight ingredient recognition while editing a recipe's leaf row. */
  readonly recognizeIngredient?: boolean;
  /** Which keys the editor takes: a row's, or the item screen heading's. */
  readonly keys?: "row" | "heading";
  /** A new item made beside me is assigned this bucket once created. */
  readonly bucketId?: string | null;
  /** On a surface of flat lists, the list I'm shown in. */
  readonly group?: string;
  /** Called when an edit deletes my item. */
  readonly onRemoved?: () => void;
  readonly className?: string;
  /** How the name shows out of edit mode. */
  readonly children: ReactNode;
};

/**
 * I am the part of an item's row its name takes, or could: pressing
 * anywhere in it edits the name. The name itself is the button that does
 * so for assistive tech and keyboards.
 * Outside an edit surface, or when the item can't be edited, I only show
 * the name.
 */
export function EditableName({
  itemId,
  planId,
  name,
  hasChildren,
  canEdit,
  recognizeIngredient = false,
  keys = "row",
  bucketId,
  group,
  onRemoved,
  className,
  children,
}: EditableNameProps) {
  const surface = useEditSurface();
  const key = { id: itemId };
  const editable = surface !== null && canEdit;
  const editing = editable && surface.isEditing(key);
  const button = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    surface?.register(
      { id: itemId },
      {
        editable,
        initialText: name,
        commit: (text) =>
          surface.commitItem(
            { id: itemId, planId, name, hasChildren, onRemoved },
            text,
          ),
      },
    );
  });

  useEffect(() => {
    if (editing || !surface?.wantsFocus({ id: itemId })) return;
    button.current?.focus();
    surface.focused({ id: itemId });
  });

  if (!editable) {
    return <span className={clsx("min-w-0", className)}>{children}</span>;
  }

  if (editing) {
    const Editor = recognizeIngredient ? IngredientNameEditor : ItemNameEditor;
    const actions: RowActions = {
      split: (atStart) =>
        keys === "heading"
          ? surface.addFirstChild(itemId, planId)
          : surface.split(key, atStart, { planId, bucketId, group }),
      remove: (direction) => surface.remove(key, direction),
      cancel: () => surface.cancel(key),
      hasChildren,
    };
    return (
      <span className={clsx("flex min-w-0 flex-1", className)}>
        <Editor
          initialText={surface.resumeText() ?? name}
          caret={surface.caret}
          keymap={
            keys === "heading" ? headingKeymap(actions) : rowKeymap(actions)
          }
          label={`Name of ${displayName(name)}`}
          editKey={keyString(key)}
          onChange={surface.setText}
          onEnd={() => surface.end(key)}
        />
      </span>
    );
  }

  return (
    // A convenience for pointers; the name's own button serves everyone.
    <span
      className={clsx("flex min-w-0 cursor-text", className)}
      onClick={() => surface.start(key)}
    >
      <button
        ref={button}
        type="button"
        className="flex items-center gap-xs text-left"
      >
        {children}
      </button>
    </span>
  );
}
