import { screen } from "@/test";
import { afterEach, beforeEach, vi } from "vitest";
import { selectRange } from "./editor-dom";

/** user-event 14 recognizes rich contenteditables but not plaintext-only yet. */
export function editableMorsel(name: string) {
  const element = screen.getByRole("combobox", { name });
  if (element.getAttribute("contenteditable") === "plaintext-only")
    element.setAttribute("contenteditable", "true");
  return element;
}

/** jsdom has no editing commands. This models insertion, not native undo history. */
export function withTextInsertion() {
  const original = Object.getOwnPropertyDescriptor(document, "execCommand");
  beforeEach(() => {
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn((command: string, _ui: boolean, text: string) => {
        const selection = window.getSelection();
        const element = document.activeElement;
        if (command !== "insertText" || !selection?.rangeCount || !element)
          return false;
        const range = selection.getRangeAt(0);
        const prefix = range.cloneRange();
        prefix.selectNodeContents(element);
        prefix.setEnd(range.startContainer, range.startOffset);
        const cursor = prefix.toString().length + text.length;
        range.deleteContents();
        const node = document.createTextNode(text);
        range.insertNode(node);
        element.normalize();
        selectRange(element as HTMLElement, { start: cursor, end: cursor });
        element.dispatchEvent(
          new InputEvent("input", {
            bubbles: true,
            inputType: "insertText",
            data: text,
          }),
        );
        return true;
      }),
    });
  });
  afterEach(() => {
    if (original) Object.defineProperty(document, "execCommand", original);
    else Reflect.deleteProperty(document, "execCommand");
  });
}
