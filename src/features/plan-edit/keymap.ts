import { isBlankName } from "@/lib/plan-item-name";

/** Which way a removal moves focus: to the item before, or after. */
export type Direction = "backward" | "forward";

export type Modifiers = {
  readonly shift?: boolean;
  readonly alt?: boolean;
  readonly ctrl?: boolean;
  readonly meta?: boolean;
};

/** One keydown in the editor, and the text and caret it found. */
export type KeyContext = {
  readonly key: string;
  readonly modifiers: Required<Modifiers>;
  readonly text: string;
  readonly atStart: boolean;
  readonly atEnd: boolean;
};

/** What a key does, and when; left out, `when` always holds. */
export type Binding = {
  readonly key: string;
  readonly modifiers?: Modifiers;
  readonly when?: (ctx: KeyContext) => boolean;
  readonly run: (ctx: KeyContext) => void;
};

export type Keymap = readonly Binding[];

/** What a row's keys ask of the row hosting the editor. */
export type RowActions = {
  split(atStart: boolean): void;
  remove(direction: Direction): void;
  cancel(): void;
  readonly hasChildren: boolean;
};

const NO_MODIFIERS: Required<Modifiers> = {
  shift: false,
  alt: false,
  ctrl: false,
  meta: false,
};

/**
 * I find the binding for a keydown: its key, exactly its modifiers, and a
 * condition that holds. Nothing matching leaves the key to the browser.
 */
export function matchBinding(
  keymap: Keymap,
  ctx: KeyContext,
): Binding | undefined {
  return keymap.find((binding) => {
    if (binding.key !== ctx.key) return false;
    const wanted = { ...NO_MODIFIERS, ...binding.modifiers };
    const pressed = ctx.modifiers;
    return (
      wanted.shift === pressed.shift &&
      wanted.alt === pressed.alt &&
      wanted.ctrl === pressed.ctrl &&
      wanted.meta === pressed.meta &&
      (binding.when?.(ctx) ?? true)
    );
  });
}

/** I give the bindings every host shares: removing and cancelling. */
function sharedBindings(actions: RowActions): Keymap {
  const removable = (ctx: KeyContext) =>
    ctx.text === "" && !actions.hasChildren;
  return [
    {
      key: "Backspace",
      when: removable,
      run: () => actions.remove("backward"),
    },
    { key: "Delete", when: removable, run: () => actions.remove("forward") },
    { key: "Escape", run: () => actions.cancel() },
  ];
}

/** I give a row's keys: Enter splits an item with something in it. */
export function rowKeymap(actions: RowActions): Keymap {
  return [
    {
      key: "Enter",
      when: (ctx) => !isBlankName(ctx.text),
      run: (ctx) => actions.split(ctx.atStart),
    },
    ...sharedBindings(actions),
  ];
}

/** I give a heading's keys: Enter always splits. */
export function headingKeymap(actions: RowActions): Keymap {
  return [
    { key: "Enter", run: () => actions.split(false) },
    ...sharedBindings(actions),
  ];
}
