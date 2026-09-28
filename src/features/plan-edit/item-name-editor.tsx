"use client";

import { useBlockScreenEscape } from "@/components/screen";
import { Input } from "@heroui/react";
import { KeyboardEvent, useLayoutEffect, useRef } from "react";
import { Keymap, matchBinding } from "./keymap";
import { Caret } from "./surface";

export type ItemNameEditorProps = {
  readonly initialText: string;
  readonly caret: Caret;
  readonly keymap: Keymap;
  /** Names the field for anyone who can't see its row. */
  readonly label: string;
  /** Tells a remounted editor for the same item from any other. */
  readonly editKey: string;
  readonly onChange: (text: string) => void;
  /** Called once focus has left the item for good. */
  readonly onEnd: (text: string) => void;
};

/**
 * I am the plain field an item's name is edited in: I take focus when I
 * appear, run whatever my keymap binds to a key, and say when focus has
 * left for good. A field for the same item taking focus straight after I
 * lose it, as when my row moves, isn't focus leaving.
 */
export function ItemNameEditor({
  initialText,
  caret,
  keymap,
  label,
  editKey,
  onChange,
  onEnd,
}: ItemNameEditorProps) {
  const input = useRef<HTMLInputElement>(null);
  useBlockScreenEscape(true);

  useLayoutEffect(() => {
    const element = input.current;
    if (element === null) return;
    element.focus();
    const at = caret === "start" ? 0 : element.value.length;
    element.setSelectionRange(at, at);
  }, [caret]);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const { value, selectionStart, selectionEnd } = event.currentTarget;
    const ctx = {
      key: event.key,
      modifiers: {
        shift: event.shiftKey,
        alt: event.altKey,
        ctrl: event.ctrlKey,
        meta: event.metaKey,
      },
      text: value,
      atStart: selectionStart === 0 && selectionEnd === 0,
      atEnd: selectionStart === value.length,
    };
    const binding = matchBinding(keymap, ctx);
    if (binding === undefined) return;
    event.preventDefault();
    binding.run(ctx);
  }

  return (
    <Input
      ref={input}
      aria-label={label}
      data-edit-key={editKey}
      defaultValue={initialText}
      className="h-auto min-w-0 flex-1 rounded-xs border-0 bg-transparent p-0 text-inherit shadow-none"
      onChange={(event) => onChange(event.currentTarget.value)}
      onKeyDown={handleKeyDown}
      onBlur={(event) => {
        const value = event.currentTarget.value;
        queueMicrotask(() => {
          const now = document.activeElement;
          if (now instanceof HTMLElement && now.dataset.editKey === editKey) {
            return;
          }
          onEnd(value);
        });
      }}
    />
  );
}
