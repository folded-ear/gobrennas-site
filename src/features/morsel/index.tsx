"use client";

import {
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEventHandler,
  type RefCallback,
} from "react";
import { insertText, readSelection, textRange } from "./editor-dom";
import {
  MORSEL_GROUPS,
  replaceSuggestion,
  type MorselChoice,
  type MorselRecognition,
  type MorselSuggestion,
  type MorselSuggestions,
  type TextRange,
} from "./types";

export type MorselProps = {
  value: string;
  label: string;
  descriptionId?: string;
  placeholder?: string;
  isDisabled?: boolean;
  recognition?: MorselRecognition;
  suggestions?: MorselSuggestions;
  inputRef?: RefCallback<HTMLDivElement>;
  onChange: (raw: string, cursor: number, inputType?: string) => void;
  onChoose?: (raw: string, cursor: number, choice: MorselChoice) => void;
  onCursorChange?: (cursor: number) => void;
  onFocus?: (cursor: number) => void;
  onBlur?: () => void;
  onCompositionStart?: () => void;
  onCompositionEnd?: (raw: string, cursor: number) => void;
  onKeyDown?: KeyboardEventHandler<HTMLDivElement>;
  onEnter?: () => void;
  onPasteLines?: (text: string, selection: TextRange) => boolean;
};

/** Plain text and range decoration. Consumers own requests, row actions, and saving. */
export function Morsel({
  value,
  label,
  descriptionId,
  placeholder = "e.g. 2 cups flour",
  isDisabled = false,
  recognition,
  suggestions,
  inputRef,
  onChange,
  onChoose,
  onCursorChange,
  onFocus,
  onBlur,
  onCompositionStart,
  onCompositionEnd,
  onKeyDown,
  onEnter,
  onPasteLines,
}: MorselProps) {
  const id = `morsel-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const editor = useRef<HTMLDivElement>(null);
  const composing = useRef(false);
  const inserting = useRef(false);
  const lastCursor = useRef(0);
  const [context, setContext] = useState({
    raw: value,
    cursor: value.length,
    focused: false,
    composing: false,
  });
  const [dismissed, setDismissed] = useState(false);
  const [active, setActive] = useState(-1);
  const [error, setError] = useState("");

  useLayoutEffect(() => {
    const element = editor.current;
    // Never rewrite DOM in response to recognition or a normal controlled-value echo.
    if (element && !composing.current && element.textContent !== value)
      element.textContent = value;
  }, [value]);

  function cursorChanged() {
    const element = editor.current;
    if (
      !element ||
      document.activeElement !== element ||
      composing.current ||
      inserting.current ||
      isDisabled
    )
      return;
    const cursor = readSelection(element).start;
    if (cursor === lastCursor.current) return;
    lastCursor.current = cursor;
    setContext({
      raw: element.textContent ?? "",
      cursor,
      focused: true,
      composing: false,
    });
    setActive(-1);
    setDismissed(false);
    onCursorChange?.(cursor);
  }
  const selectionChanged = useEffectEvent(cursorChanged);
  useEffect(() => {
    const listener = () => selectionChanged();
    document.addEventListener("selectionchange", listener);
    return () => document.removeEventListener("selectionchange", listener);
  }, []);

  const matching =
    recognition?.raw === value && !context.composing ? recognition : undefined;
  useEffect(() => {
    const element = editor.current;
    if (
      !element ||
      typeof Highlight === "undefined" ||
      typeof CSS === "undefined" ||
      !CSS.highlights
    )
      return;
    const types = ["quantity", "unit", "ingredient"] as const;
    for (const type of types) {
      const ranges =
        matching?.ranges
          .filter((range) => range.type === type)
          .flatMap((range) => {
            const domRange = textRange(element, range);
            return domRange ? [domRange] : [];
          }) ?? [];
      CSS.highlights.set(`${id}-${type}`, new Highlight(...ranges));
    }
    return () =>
      types.forEach((type) => CSS.highlights.delete(`${id}-${type}`));
  }, [id, matching]);

  const currentSuggestions =
    suggestions?.raw === value &&
    suggestions.raw === context.raw &&
    suggestions.cursor === context.cursor
      ? suggestions.options
      : [];
  const options = MORSEL_GROUPS.flatMap((kind) =>
    currentSuggestions.filter((option) => option.food.kind === kind),
  );
  const open =
    context.focused &&
    !context.composing &&
    !isDisabled &&
    !dismissed &&
    options.length > 0;

  function changed(inputType?: string) {
    const element = editor.current;
    if (!element || inserting.current || isDisabled) return;
    const raw = element.textContent ?? "";
    const cursor = readSelection(element).start;
    lastCursor.current = cursor;
    setContext({
      raw,
      cursor,
      focused: document.activeElement === element,
      composing: composing.current,
    });
    setActive(-1);
    setDismissed(false);
    setError("");
    onChange(raw, cursor, inputType);
  }

  function choose(suggestion: MorselSuggestion) {
    const element = editor.current;
    if (
      !element ||
      !open ||
      composing.current ||
      !suggestions ||
      element.textContent !== suggestions.raw ||
      readSelection(element).start !== suggestions.cursor
    )
      return;
    let next;
    try {
      next = replaceSuggestion(suggestions.raw, suggestion);
    } catch {
      setError("This suggestion is out of date. Keep typing to refresh it.");
      setDismissed(true);
      return;
    }
    inserting.current = true;
    const inserted = insertText(
      element,
      suggestion.replacement,
      suggestion.target,
    );
    inserting.current = false;
    if (!inserted) {
      setError("Couldn’t insert this suggestion. You can still type its name.");
      return;
    }
    lastCursor.current = next.cursor;
    setContext({
      raw: next.raw,
      cursor: next.cursor,
      focused: true,
      composing: false,
    });
    setDismissed(true);
    setActive(-1);
    setError("");
    if (onChoose) onChoose(next.raw, next.cursor, next.choice);
    else onChange(next.raw, next.cursor);
  }

  function enter() {
    if (isDisabled || composing.current) return;
    if (open && active >= 0 && options[active]) choose(options[active]);
    else onEnter?.();
  }
  // Touch keyboards can send an editing intent without a usable Enter keydown.
  const beforeInput = useEffectEvent((event: InputEvent) => {
    if (event.isComposing || composing.current) return;
    if (
      event.inputType === "insertParagraph" ||
      event.inputType === "insertLineBreak"
    ) {
      event.preventDefault();
      enter();
    }
  });
  useEffect(() => {
    const element = editor.current;
    const listener = (event: InputEvent) => beforeInput(event);
    element?.addEventListener("beforeinput", listener);
    return () => element?.removeEventListener("beforeinput", listener);
  }, []);

  return (
    <div id={id} className="relative min-w-0">
      <style>{`
      #${id} { --morsel-text: color-mix(in oklch, var(--foreground) 75%, var(--background)); --morsel-ingredient: #000; }
      .dark #${id} { --morsel-ingredient: #fff; }
      ::highlight(${id}-quantity) { color: var(--morsel-text); background-color: var(--default); }
      ::highlight(${id}-unit) { color: var(--morsel-text); text-decoration: underline dotted var(--muted); }
      ::highlight(${id}-ingredient) { color: var(--morsel-ingredient); text-shadow: 0.25px 0 0 currentColor, -0.25px 0 0 currentColor; }
      #${id} [contenteditable]:empty::before { content: attr(data-placeholder); color: var(--muted); pointer-events: none; }
    `}</style>
      <div
        ref={(element) => {
          editor.current = element;
          inputRef?.(element);
        }}
        contentEditable={isDisabled ? false : "plaintext-only"}
        suppressContentEditableWarning
        role="combobox"
        tabIndex={isDisabled ? -1 : 0}
        aria-label={label}
        aria-disabled={isDisabled}
        aria-describedby={[
          descriptionId,
          `${id}-help`,
          error ? `${id}-error` : undefined,
        ]
          .filter(Boolean)
          .join(" ")}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? `${id}-options` : undefined}
        aria-activedescendant={
          open && active >= 0 && active < options.length
            ? `${id}-option-${active}`
            : undefined
        }
        data-placeholder={placeholder}
        spellCheck={false}
        className="min-h-10 w-full whitespace-pre-wrap break-words rounded-lg border border-border bg-surface px-md py-sm text-base leading-6 text-(--morsel-text) outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 aria-disabled:opacity-50"
        onFocus={(event) => {
          const cursor = readSelection(event.currentTarget).start;
          lastCursor.current = cursor;
          setContext({
            raw: event.currentTarget.textContent ?? "",
            cursor,
            focused: true,
            composing: false,
          });
          setDismissed(false);
          setActive(-1);
          onFocus?.(cursor);
        }}
        onBlur={() => {
          setContext((current) => ({ ...current, focused: false }));
          setDismissed(true);
          setActive(-1);
          onBlur?.();
        }}
        onKeyUp={cursorChanged}
        onPointerUp={cursorChanged}
        onInput={(event) =>
          changed((event.nativeEvent as InputEvent).inputType)
        }
        onCompositionStart={() => {
          composing.current = true;
          setContext((current) => ({ ...current, composing: true }));
          setDismissed(true);
          onCompositionStart?.();
        }}
        onCompositionEnd={(event) => {
          composing.current = false;
          changed();
          onCompositionEnd?.(
            event.currentTarget.textContent ?? "",
            readSelection(event.currentTarget).start,
          );
        }}
        onPaste={(event) => {
          if (isDisabled || composing.current) return;
          event.preventDefault();
          const text = event.clipboardData.getData("text/plain");
          if (onPasteLines?.(text, readSelection(event.currentTarget))) return;
          if (
            !insertText(event.currentTarget, text.replace(/\r\n|[\r\n]/g, " "))
          )
            setError("Couldn’t paste. Your text is still here.");
        }}
        onKeyDown={(event) => {
          if (
            isDisabled ||
            composing.current ||
            event.nativeEvent.isComposing ||
            event.keyCode === 229
          )
            return;
          if (
            (event.key === "ArrowDown" || event.key === "ArrowUp") &&
            options.length
          ) {
            event.preventDefault();
            setDismissed(false);
            setActive((index) =>
              event.key === "ArrowDown"
                ? (index + 1) % options.length
                : index <= 0
                  ? options.length - 1
                  : index - 1,
            );
          } else if (event.key === "Escape") {
            event.preventDefault();
            setDismissed(true);
            setActive(-1);
          } else if (
            event.key === "Enter" &&
            open &&
            active >= 0 &&
            options[active]
          ) {
            event.preventDefault();
            choose(options[active]);
          } else {
            if (event.key === "Tab") setDismissed(true);
            if (event.key === "Enter") {
              event.preventDefault();
              enter();
            }
            onKeyDown?.(event);
          }
        }}
      />
      <span id={`${id}-help`} className="sr-only">
        Use arrow keys to browse suggestions, Enter to choose, Escape to
        dismiss, and Tab to move on.
      </span>
      {open && (
        <div
          id={`${id}-options`}
          role="listbox"
          aria-label={`${label} suggestions`}
          className="absolute top-full z-20 mt-xs max-h-72 w-full overflow-y-auto rounded-lg border border-border bg-overlay p-xs shadow-md"
        >
          {MORSEL_GROUPS.map((kind) => {
            const group = options.filter((option) => option.food.kind === kind);
            return group.length ? (
              <div
                key={kind}
                role="group"
                aria-label={kind}
                className="border-t border-separator py-xxs first:border-t-0"
              >
                <div className="px-sm py-xxs text-xs font-medium text-muted">
                  {kind}
                </div>
                {group.map((option) => {
                  const index = options.indexOf(option);
                  return (
                    <div
                      key={`${kind}:${option.food.id}`}
                      id={`${id}-option-${index}`}
                      role="option"
                      aria-selected={active === index}
                      className={`flex cursor-pointer flex-wrap items-baseline gap-x-md gap-y-xxs rounded px-sm py-xs ${active === index ? "bg-accent-soft text-accent-soft-foreground" : "hover:bg-default"}`}
                      onPointerDown={(event) => event.preventDefault()}
                      onClick={() => choose(option)}
                      ref={(node) => {
                        if (open && active === index)
                          node?.scrollIntoView?.({ block: "nearest" });
                      }}
                    >
                      <span className="text-sm font-medium">
                        {option.food.name}
                      </span>
                      {option.food.detail && (
                        <span className="text-xs text-muted">
                          {option.food.detail}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : null;
          })}
        </div>
      )}
      <div role="status" className="sr-only">
        {open ? `${options.length} suggestions available.` : ""}
      </div>
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-xs text-xs text-danger"
        >
          {error}
        </p>
      )}
    </div>
  );
}
