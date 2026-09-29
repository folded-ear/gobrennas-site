import type { MorselChoice } from "@/features/morsel/types";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import type {
  IngredientRecognition,
  RecognizeIngredient,
} from "./ingredient-recognition";
import { toMorselSuggestions } from "./ingredient-recognition";
import type { RecognitionQueue } from "./recognition-queue";

type Context = {
  raw: string;
  cursor: number;
  immediate: boolean;
  suggest: boolean;
  choice?: MorselChoice;
};
type ScheduleOptions = {
  retry?: boolean;
  immediate?: boolean;
  choice?: MorselChoice;
};

export function useIngredientRecognition({
  clientId,
  raw,
  choice,
  isDisabled,
  pastedRow,
  recognize,
  queue,
  onRecognized,
}: {
  clientId: string;
  raw: string;
  choice?: MorselChoice;
  isDisabled: boolean;
  pastedRow?: { raw: string };
  recognize: RecognizeIngredient;
  queue: RecognitionQueue;
  onRecognized: (result: IngredientRecognition) => void;
}) {
  const [context, setContext] = useState<Context>();
  const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");
  const current = useRef<Context | undefined>(undefined);
  const request = useRef<AbortController | undefined>(undefined);
  const composing = useRef(false);
  const focus = useRef(false);
  const [focused, setFocused] = useState(false);
  const [result, setResult] = useState<{
    context: Context;
    data: IngredientRecognition;
  }>();
  const accept = useEffectEvent(onRecognized);

  function cancel() {
    request.current?.abort();
    current.current = undefined;
    setContext(undefined);
    setStatus("idle");
  }

  function schedule(
    text: string,
    cursor: number,
    options: ScheduleOptions = {},
  ) {
    if (composing.current || isDisabled) return;
    const { retry = false, immediate = false } = options;
    const selected = "choice" in options ? options.choice : choice;
    cursor = Math.max(0, Math.min(cursor, text.length));
    if (
      !retry &&
      current.current?.raw === text &&
      current.current.cursor === cursor &&
      current.current.suggest === focus.current &&
      current.current.choice === selected &&
      (!immediate || current.current.immediate)
    )
      return;
    request.current?.abort();
    // Object identity is the revision, even when text changes away and back.
    const next = {
      raw: text,
      cursor,
      immediate,
      suggest: focus.current,
      choice: selected,
    };
    current.current = next;
    setContext(next);
    setStatus(text.trim().length >= 2 ? "pending" : "idle");
  }

  const pasted = useEffectEvent((text: string) => {
    if (text === raw) schedule(text, text.length, { immediate: true });
  });
  useEffect(() => {
    // Each paste has its own identity, even when its text repeats.
    if (pastedRow !== undefined) pasted(pastedRow.raw);
  }, [pastedRow]);

  useEffect(() => {
    if (!context || context.raw !== raw || raw.trim().length < 2 || isDisabled)
      return;
    const controller = new AbortController();
    request.current = controller;
    const timer = setTimeout(
      async () => {
        try {
          const result = await queue.run(clientId, controller.signal, () =>
            recognize(raw, context.cursor, controller.signal, {
              choice: context.choice,
              suggest: context.suggest,
            }),
          );
          if (controller.signal.aborted || current.current !== context) return;
          if (result.raw !== raw || result.cursor !== context.cursor)
            throw new Error("Recognition did not match its request.");
          setResult({ context, data: result });
          accept(result);
          setStatus("idle");
        } catch {
          if (!controller.signal.aborted && current.current === context)
            setStatus("error");
        }
      },
      context.immediate ? 0 : 300,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [clientId, raw, context, isDisabled, recognize, queue]);

  return {
    status: context?.raw === raw && !isDisabled ? status : "idle",
    suggestions:
      focused &&
      result &&
      result.context === context &&
      context?.raw === raw &&
      !isDisabled
        ? {
            raw,
            cursor: context.cursor,
            options: toMorselSuggestions(result.data),
          }
        : undefined,
    focus(cursor: number) {
      focus.current = true;
      setFocused(true);
      schedule(raw, cursor, { retry: true });
    },
    blur() {
      focus.current = false;
      setFocused(false);
    },
    schedule,
    cancel,
    startComposition() {
      composing.current = true;
      cancel();
    },
    endComposition(text: string, cursor: number, selected?: MorselChoice) {
      composing.current = false;
      schedule(text, cursor, { choice: selected });
    },
  };
}
