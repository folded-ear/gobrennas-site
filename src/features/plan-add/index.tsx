"use client";

import { PlanPicker } from "@/features/plan-picker";
import type { TimelineSection } from "@/features/plan-timeline/model";
import { sectionLabel } from "@/features/plan-timeline/section-label";
import {
  chooseIngredient,
  newIngredientDraft,
  updateIngredient,
} from "@/features/recipe-form/ingredient-draft";
import { IngredientInput } from "@/features/recipe-form/ingredient-input";
import type { RecognizeIngredient } from "@/features/recipe-form/ingredient-recognition";
import { createRecognitionQueue } from "@/features/recipe-form/recognition-queue";
import { useRecognizeIngredient } from "@/features/recipe-form/use-recognize-ingredient";
import { Button } from "@heroui/react";
import { Plus } from "lucide-react";
import { useCallback, useId, useLayoutEffect, useRef, useState } from "react";
import {
  canAddToSection,
  destinationBucket,
  type AddPlan,
} from "./destination";
import { useAddItem } from "./use-add-item";

export function PlanAdd({
  plans,
  section,
}: {
  plans: readonly AddPlan[];
  section: TimelineSection;
}) {
  const eligible = plans.filter((plan) => canAddToSection(plan, section));
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  const label = sectionLabel(section);
  useLayoutEffect(() => {
    if (!open && restoreFocus.current) {
      trigger.current?.focus();
      restoreFocus.current = false;
    }
  }, [open]);
  if (!eligible.length) return null;
  return (
    <div className="relative py-xs">
      {open ? (
        <AddForm
          plans={eligible}
          section={section}
          label={label}
          onClose={() => {
            restoreFocus.current = true;
            setOpen(false);
          }}
        />
      ) : (
        <Button
          ref={trigger}
          size="sm"
          variant="ghost"
          className="h-xl gap-xs px-xs text-muted"
          aria-label={`Add to ${label}`}
          onPress={() => setOpen(true)}
        >
          <Plus size={14} aria-hidden /> Add
        </Button>
      )}
    </div>
  );
}

function AddForm({
  plans,
  section,
  label,
  onClose,
}: {
  plans: readonly AddPlan[];
  section: TimelineSection;
  label: string;
  onClose: () => void;
}) {
  const [planId, setPlanId] = useState(
    () =>
      (plans.find((plan) => destinationBucket(plan, section)) ?? plans[0]).id,
  );
  const plan = plans.find((it) => it.id === planId);
  const [row, setRow] = useState(newIngredientDraft);
  const [queue] = useState(createRecognitionQueue);
  const input = useRef<HTMLDivElement>(null);
  const helpId = useId();
  const recognizeIngredient = useRecognizeIngredient();
  const recognize = useCallback<RecognizeIngredient>(
    (raw, cursor, signal, options) =>
      raw.startsWith("!")
        ? Promise.resolve({ raw, cursor, ranges: [] })
        : recognizeIngredient(raw, cursor, signal, options),
    [recognizeIngredient],
  );
  const save = useAddItem(section);
  useLayoutEffect(() => input.current?.focus(), []);

  async function submit() {
    if (await save.add(plan, row)) onClose();
  }

  return (
    <form
      aria-label={`Add to ${label}`}
      className="flex flex-col gap-sm"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="flex flex-col gap-sm sm:flex-row sm:items-start">
        {plans.length > 1 && !save.pending ? (
          <PlanPicker
            compact
            label="Add to plan"
            plans={plans}
            selectionMode="single"
            selectedIds={plan ? [plan.id] : []}
            onChange={(ids) => setPlanId(ids[0])}
          />
        ) : null}
        <IngredientInput
          row={row}
          label={`Item for ${label}`}
          helpId={helpId}
          isDisabled={save.pending}
          inputRef={(element) => {
            input.current = element;
          }}
          onChange={(raw, choice) =>
            setRow(
              (previous) =>
                updateIngredient([previous], previous.clientId, raw, choice)[0],
            )
          }
          onChoose={(raw, choice) =>
            setRow(
              (previous) =>
                chooseIngredient([previous], previous.clientId, raw, choice)[0],
            )
          }
          onRecognized={(recognition) =>
            setRow((previous) =>
              previous.raw === recognition.raw
                ? { ...previous, recognition }
                : previous,
            )
          }
          onKeyDown={() => {}}
          onEnter={() => {
            void submit();
          }}
          onPasteLines={() => false}
          recognize={recognize}
          queue={queue}
        />
      </div>
      <span id={helpId} className="sr-only">
        Choose a suggestion or enter an item, then Add to save it.
      </span>
      {save.error ? (
        <p role="alert" className="text-sm text-danger">
          {save.error}
        </p>
      ) : null}
      <div className="flex gap-xs">
        <Button
          type="submit"
          size="sm"
          variant="primary"
          isPending={save.pending}
          isDisabled={!plan || !row.raw.trim() || save.pending}
        >
          Add
        </Button>
        <Button
          type="button"
          size="sm"
          variant="tertiary"
          isDisabled={save.pending}
          onPress={onClose}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
