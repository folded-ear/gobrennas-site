import { describe, expect, it } from "vitest";
import { textRange } from "./editor-dom";

describe("editor text ranges", () => {
  it("maps offsets across text nodes and emoji without changing the DOM", () => {
    const editor = document.createElement("div");
    editor.append(
      document.createTextNode("🍲 1 cup "),
      document.createTextNode("flour, sifted"),
    );
    const before = editor.innerHTML;
    expect(textRange(editor, { start: 9, end: 14 })?.toString()).toBe("flour");
    expect(textRange(editor, { start: 6, end: 14 })?.toString()).toBe(
      "up flour",
    );
    expect(editor.innerHTML).toBe(before);
  });

  it("rejects a range beyond the current text rather than highlighting unrelated content", () => {
    const editor = document.createElement("div");
    editor.textContent = "fl";
    expect(textRange(editor, { start: 0, end: 5 })).toBeUndefined();
  });
});
