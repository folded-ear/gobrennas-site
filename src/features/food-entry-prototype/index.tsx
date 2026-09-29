"use client";

import { MorselInput } from "@/features/morsel-input";
import { createChoiceHistory } from "@/features/morsel-input/choice-history";
import { insertText } from "@/features/morsel-input/editor-dom";
import { Button } from "@heroui/react";
import { useEffect, useRef, useState } from "react";
import {
  mockRecognize,
  type RecognitionRequest,
  type RecognitionResponse,
} from "./mock-recognition";

const EXAMPLES = ["1 cup fl", "2 cups chicken st", "1 tbsp butter, melted"];
const EMPTY_REQUEST: RecognitionRequest = { raw: "", cursor: 0 };

export function FoodEntryPrototype() {
  const editor = useRef<HTMLDivElement>(null);
  const composing = useRef(false);
  const current = useRef<RecognitionRequest>(EMPTY_REQUEST);
  const history = useRef(createChoiceHistory(EMPTY_REQUEST));
  const [request, setRequest] = useState(EMPTY_REQUEST);
  const [result, setResult] = useState<{
    request: RecognitionRequest;
    data: RecognitionResponse;
  }>();
  const [error, setError] = useState("");
  const [slow, setSlow] = useState(false);
  const [fail, setFail] = useState(false);
  const [submitted, setSubmitted] = useState("");

  function schedule(next: RecognitionRequest) {
    current.current = next;
    setRequest(next);
    setError("");
  }

  useEffect(() => {
    if (!request.raw.trim() || composing.current) return;
    const controller = new AbortController();
    void mockRecognize(
      request,
      controller.signal,
      slow ? 1600 : 300,
      fail,
    ).then(
      (data) => {
        if (
          current.current === request &&
          !controller.signal.aborted &&
          !composing.current
        )
          setResult({ request, data });
      },
      (cause: unknown) => {
        if (current.current === request && !controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "Recognition failed. Keep typing or retry.",
          );
      },
    );
    return () => controller.abort();
  }, [request, slow, fail]);

  const matching = result?.data.raw === request.raw ? result.data : undefined;
  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-wrap items-center gap-sm">
        <span className="text-xs text-muted">Examples</span>
        {EXAMPLES.map((example) => (
          <Button
            key={example}
            size="sm"
            variant="secondary"
            onPress={() => {
              if (editor.current)
                insertText(editor.current, example, {
                  start: 0,
                  end: current.current.raw.length,
                });
            }}
          >
            {example}
          </Button>
        ))}
      </div>
      <div>
        <div className="mb-xs text-sm font-medium">Ingredient</div>
        <MorselInput
          value={request.raw}
          label="Ingredient"
          inputRef={(element) => {
            editor.current = element;
          }}
          recognition={matching}
          suggestions={
            result?.request === request && !error
              ? {
                  raw: request.raw,
                  cursor: request.cursor,
                  options: result.data.suggestions,
                }
              : undefined
          }
          onChange={(raw, cursor, inputType) =>
            schedule({
              raw,
              cursor,
              choice: history.current.edit(raw, inputType),
            })
          }
          onChoose={(raw, cursor, choice) => {
            history.current.choose(raw, choice);
            schedule({ raw, cursor, choice });
          }}
          onCursorChange={(cursor) => schedule({ ...current.current, cursor })}
          onFocus={(cursor) => schedule({ ...current.current, cursor })}
          onCompositionStart={() => {
            composing.current = true;
            setResult(undefined);
          }}
          onCompositionEnd={(raw, cursor) => {
            composing.current = false;
            schedule({ ...current.current, raw, cursor });
          }}
          onEnter={() => setSubmitted(current.current.raw)}
        />
        <div
          role="status"
          aria-live="polite"
          className={`mt-xs min-h-4 text-xs ${error ? "text-danger" : "text-muted"}`}
        >
          {error ||
            (!request.raw.trim()
              ? "Start typing, or choose an example."
              : result?.request !== request
                ? "Recognizing…"
                : matching?.food
                  ? `${matching.food.kind}: ${matching.food.name}.`
                  : "No exact match yet.")}
        </div>
        {error && (
          <Button
            size="sm"
            variant="secondary"
            onPress={() => {
              setFail(false);
              schedule({ ...current.current });
            }}
          >
            Retry
          </Button>
        )}
      </div>
      <details className="text-xs text-muted">
        <summary className="cursor-pointer">Prototype controls</summary>
        <div className="mt-md flex flex-col gap-md">
          <p>
            ↑ ↓ to browse · Enter to choose · Esc to dismiss · Tab to move on
          </p>
          <div className="flex flex-wrap gap-sm">
            <span className="rounded bg-default px-sm py-xs">Quantity</span>
            <span className="px-sm py-xs underline decoration-muted decoration-dotted">
              Unit
            </span>
            <span
              className="px-sm py-xs text-black dark:text-white"
              style={{
                textShadow: "0.25px 0 0 currentColor, -0.25px 0 0 currentColor",
              }}
            >
              Ingredient
            </span>
          </div>
          <div className="flex flex-wrap gap-lg">
            <label className="flex items-center gap-sm">
              <input
                type="checkbox"
                checked={slow}
                onChange={(event) => {
                  setSlow(event.target.checked);
                  schedule({ ...current.current });
                }}
              />
              Slow responses
            </label>
            <label className="flex items-center gap-sm">
              <input
                type="checkbox"
                checked={fail}
                onChange={(event) => {
                  setFail(event.target.checked);
                  schedule({ ...current.current });
                }}
              />
              Simulate a failure
            </label>
          </div>
          <details>
            <summary className="cursor-pointer">
              Inspect the fake response
            </summary>
            <pre className="mt-md overflow-auto rounded-lg bg-surface-secondary p-md text-xs">
              {JSON.stringify(
                matching ?? { raw: request.raw, cursor: request.cursor },
                null,
                2,
              )}
            </pre>
          </details>
        </div>
      </details>
      {submitted && (
        <p className="rounded-lg bg-surface-secondary p-md text-sm">
          <strong>Entered:</strong> {submitted}{" "}
          <span className="text-muted">(Nothing is saved.)</span>
        </p>
      )}
    </div>
  );
}
