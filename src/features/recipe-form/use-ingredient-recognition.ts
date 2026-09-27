import { useEffect, useEffectEvent, useRef, useState } from "react";
import type {
  IngredientRecognition,
  RecognizeIngredient,
} from "./ingredient-recognition";
import type { RecognitionQueue } from "./recognition-queue";

type Context = { raw: string; cursor: number };

export function useIngredientRecognition({
  clientId,
  raw,
  isDisabled,
  recognize,
  queue,
  onRecognized,
}: {
  clientId: string;
  raw: string;
  isDisabled: boolean;
  recognize: RecognizeIngredient;
  queue: RecognitionQueue;
  onRecognized: (result: IngredientRecognition) => void;
}) {
  const [context, setContext] = useState<Context>();
  const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");
  const current = useRef<Context | undefined>(undefined);
  const request = useRef<AbortController | undefined>(undefined);
  const composing = useRef(false);
  const accept = useEffectEvent(onRecognized);

  function cancel() {
    request.current?.abort();
    current.current = undefined;
    setContext(undefined);
    setStatus("idle");
  }

  function schedule(text: string, cursor: number, retry = false) {
    if (composing.current || isDisabled) return;
    cursor = Math.max(0, Math.min(cursor, text.length));
    if (
      !retry &&
      current.current?.raw === text &&
      current.current.cursor === cursor
    )
      return;
    request.current?.abort();
    // Object identity is the revision, even when text changes away and back.
    const next = { raw: text, cursor };
    current.current = next;
    setContext(next);
    setStatus(text.trim().length >= 2 ? "pending" : "idle");
  }

  useEffect(() => {
    if (!context || context.raw !== raw || raw.trim().length < 2 || isDisabled)
      return;
    const controller = new AbortController();
    request.current = controller;
    const timer = setTimeout(async () => {
      try {
        const result = await queue.run(clientId, controller.signal, () =>
          recognize(raw, context.cursor, controller.signal),
        );
        if (controller.signal.aborted || current.current !== context) return;
        if (result.raw !== raw || result.cursor !== context.cursor)
          throw new Error("Recognition did not match its request.");
        accept(result);
        setStatus("idle");
      } catch {
        if (!controller.signal.aborted && current.current === context)
          setStatus("error");
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [clientId, raw, context, isDisabled, recognize, queue]);

  return {
    status: context?.raw === raw && !isDisabled ? status : "idle",
    schedule,
    cancel,
    startComposition() {
      composing.current = true;
      cancel();
    },
    endComposition(text: string, cursor: number) {
      composing.current = false;
      schedule(text, cursor);
    },
  };
}
