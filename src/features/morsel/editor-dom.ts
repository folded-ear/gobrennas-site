import type { TextRange } from "./types";

export function readSelection(editor: HTMLElement): TextRange {
  const selection = window.getSelection();
  const length = editor.textContent?.length ?? 0;
  if (
    !selection?.rangeCount ||
    !editor.contains(selection.anchorNode) ||
    !editor.contains(selection.focusNode)
  )
    return { start: length, end: length };
  const selected = selection.getRangeAt(0);
  const prefix = selected.cloneRange();
  prefix.selectNodeContents(editor);
  prefix.setEnd(selected.startContainer, selected.startOffset);
  const start = prefix.toString().length;
  return { start, end: start + selected.toString().length };
}

/** Server offsets and DOM text-node offsets both count UTF-16 code units. */
export function textRange(
  editor: HTMLElement,
  { start, end }: TextRange,
): Range | undefined {
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    end < start ||
    end > (editor.textContent?.length ?? 0)
  )
    return;
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let offset = 0;
  let foundStart = false;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const length = node.textContent?.length ?? 0;
    if (!foundStart && start <= offset + length) {
      range.setStart(node, start - offset);
      foundStart = true;
    }
    if (foundStart && end <= offset + length) {
      range.setEnd(node, end - offset);
      return range;
    }
    offset += length;
  }
  if (start === 0 && end === 0) {
    range.selectNodeContents(editor);
    range.collapse(true);
    return range;
  }
}

export function selectRange(editor: HTMLElement, target: TextRange) {
  const range = textRange(editor, target);
  if (!range) return false;
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  return Boolean(selection);
}

export function focusAtEnd(editor: HTMLElement) {
  editor.focus();
  const length = editor.textContent?.length ?? 0;
  selectRange(editor, { start: length, end: length });
}

export function insertText(
  editor: HTMLElement,
  text: string,
  target?: TextRange,
): boolean {
  editor.focus();
  if (target && !selectRange(editor, target)) return false;
  // Deprecated, but preserves native undo; a Range.insertNode fallback does not.
  if (typeof document.execCommand !== "function") return false;
  return document.execCommand("insertText", false, text);
}
