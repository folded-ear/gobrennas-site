import { describe, expect, it, vi } from "vitest";
import {
  headingKeymap,
  KeyContext,
  matchBinding,
  RowActions,
  rowKeymap,
} from "./keymap";

const NO_MODIFIERS = { shift: false, alt: false, ctrl: false, meta: false };

function press(
  key: string,
  text: string,
  { atStart = false, shift = false } = {},
): KeyContext {
  return {
    key,
    modifiers: { ...NO_MODIFIERS, shift },
    text,
    atStart,
    atEnd: !atStart,
  };
}

function actions(hasChildren = false): RowActions {
  return {
    split: vi.fn(),
    remove: vi.fn(),
    cancel: vi.fn(),
    hasChildren,
  };
}

/** I run whatever the keymap binds to a keydown, saying if anything was. */
function run(keymap: ReturnType<typeof rowKeymap>, ctx: KeyContext) {
  const binding = matchBinding(keymap, ctx);
  binding?.run(ctx);
  return binding !== undefined;
}

describe("matchBinding", () => {
  it("finds a binding for its key, pressed without modifiers", () => {
    const binding = { key: "Enter", run: vi.fn() };

    expect(matchBinding([binding], press("Enter", "Pie"))).toBe(binding);
  });

  it("finds nothing for a key pressed with a modifier it doesn't name", () => {
    const binding = { key: "Enter", run: vi.fn() };

    expect(
      matchBinding([binding], press("Enter", "Pie", { shift: true })),
    ).toBeUndefined();
  });

  it("finds a binding for exactly the modifiers it names", () => {
    const binding = { key: "Enter", modifiers: { shift: true }, run: vi.fn() };

    expect(
      matchBinding([binding], press("Enter", "Pie", { shift: true })),
    ).toBe(binding);
    expect(matchBinding([binding], press("Enter", "Pie"))).toBeUndefined();
  });

  it("passes over a binding whose condition fails", () => {
    const binding = { key: "Enter", when: () => false, run: vi.fn() };

    expect(matchBinding([binding], press("Enter", "Pie"))).toBeUndefined();
  });
});

describe("rowKeymap", () => {
  it("splits on Enter, saying whether the caret was at the start", () => {
    const row = actions();

    expect(run(rowKeymap(row), press("Enter", "Pie", { atStart: true }))).toBe(
      true,
    );
    expect(row.split).toHaveBeenCalledWith(true);
  });

  it("leaves Enter alone in a blank item", () => {
    const row = actions();

    expect(run(rowKeymap(row), press("Enter", "  "))).toBe(false);
    expect(row.split).not.toHaveBeenCalled();
  });

  it("removes an empty item with nothing below it, backward on Backspace", () => {
    const row = actions();

    expect(run(rowKeymap(row), press("Backspace", ""))).toBe(true);
    expect(row.remove).toHaveBeenCalledWith("backward");
  });

  it("removes an empty item with nothing below it, forward on Delete", () => {
    const row = actions();

    expect(run(rowKeymap(row), press("Delete", ""))).toBe(true);
    expect(row.remove).toHaveBeenCalledWith("forward");
  });

  it("leaves Backspace to the browser in text, even whitespace", () => {
    const row = actions();

    expect(run(rowKeymap(row), press("Backspace", " "))).toBe(false);
    expect(row.remove).not.toHaveBeenCalled();
  });

  it("leaves an empty item with children alone", () => {
    const row = actions(true);

    expect(run(rowKeymap(row), press("Backspace", ""))).toBe(false);
    expect(run(rowKeymap(row), press("Delete", ""))).toBe(false);
  });

  it("cancels on Escape", () => {
    const row = actions();

    expect(run(rowKeymap(row), press("Escape", "Pie"))).toBe(true);
    expect(row.cancel).toHaveBeenCalled();
  });
});

describe("headingKeymap", () => {
  it("splits on Enter wherever the caret is, even when blank", () => {
    const heading = actions();

    expect(
      run(headingKeymap(heading), press("Enter", "", { atStart: true })),
    ).toBe(true);
    expect(heading.split).toHaveBeenCalled();
  });

  it("removes and cancels as a row does", () => {
    const heading = actions();

    run(headingKeymap(heading), press("Backspace", ""));
    run(headingKeymap(heading), press("Escape", ""));

    expect(heading.remove).toHaveBeenCalledWith("backward");
    expect(heading.cancel).toHaveBeenCalled();
  });
});
