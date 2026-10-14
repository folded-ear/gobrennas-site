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
import { Button, Dropdown, Label } from "@heroui/react";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { FocusScope } from "react-aria";
import {
  canAddToSection,
  destinationBucket,
  type AddPlan,
} from "./destination";
import { useAddItem } from "./use-add-item";

export function PlanAdd({
  plans,
  section,
  onAddBucket,
  isOpen: open,
  onOpenChange: setOpen,
}: {
  plans: readonly AddPlan[];
  section: TimelineSection;
  onAddBucket?: () => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const eligible = plans.filter((plan) => canAddToSection(plan, section));
  const label = sectionLabel(section);
  if (!eligible.length && !onAddBucket) return null;
  return onAddBucket ? (
    <Dropdown>
      <Button
        variant="ghost"
        className="gap-xs px-sm text-muted"
        aria-label={`Add to ${label}`}
      >
        <Plus aria-hidden /> Add
      </Button>
      <Dropdown.Popover>
        <Dropdown.Menu aria-label={`Add to ${label}`}>
          <Dropdown.Item
            id="recipe"
            textValue="Add Recipe"
            isDisabled={!eligible.length || open}
            onAction={() => setOpen(true)}
          >
            <Label>Add Recipe</Label>
          </Dropdown.Item>
          <Dropdown.Item
            id="bucket"
            textValue="Add Bucket"
            onAction={onAddBucket}
          >
            <Label>Add Bucket</Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  ) : (
    <Button
      variant="ghost"
      className="gap-xs px-sm text-muted"
      aria-label={`Add to ${label}`}
      isDisabled={open}
      aria-expanded={open}
      onPress={() => setOpen(true)}
    >
      <Plus aria-hidden /> Add
    </Button>
  );
}

export function PlanAddForm({
  plans,
  section,
  onClose,
}: {
  plans: readonly AddPlan[];
  section: TimelineSection;
  onClose: () => void;
}) {
  const label = sectionLabel(section);
  const [planId, setPlanId] = useState(
    () =>
      (plans.find((plan) => destinationBucket(plan, section)) ?? plans[0])
        ?.id ?? "",
  );
  const plan = plans.find((it) => it.id === planId);
  const [row, setRow] = useState(newIngredientDraft);
  const [queue] = useState(createRecognitionQueue);
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
  const form = useRef<HTMLFormElement>(null);
  // Don't useLayoutEffect - it will race with React-ARIA's inert from modals,
  // such as select menu.
  useEffect(() => {
    const rect = form.current?.getBoundingClientRect();
    if (rect && (rect.top < 0 || rect.bottom > window.innerHeight)) {
      form.current?.scrollIntoView?.({ block: "nearest" });
    }
  }, []);

  async function submit() {
    if (await save.add(plan, row)) onClose();
  }

  return (
    <FocusScope restoreFocus>
      <form
        ref={form}
        aria-busy={save.pending}
        onKeyDown={(event) => {
          if (event.key === "Escape" && !save.pending) {
            event.stopPropagation();
            onClose();
          }
        }}
        aria-label={`Add to ${label}`}
        className="flex flex-col gap-sm py-xs"
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
          <FocusScope autoFocus>
            <IngredientInput
              row={row}
              label={`Item for ${label}`}
              helpId={helpId}
              isDisabled={save.pending}
              onChange={(raw, choice) =>
                setRow(
                  (previous) =>
                    updateIngredient(
                      [previous],
                      previous.clientId,
                      raw,
                      choice,
                    )[0],
                )
              }
              onChoose={(raw, choice) =>
                setRow(
                  (previous) =>
                    chooseIngredient(
                      [previous],
                      previous.clientId,
                      raw,
                      choice,
                    )[0],
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
          </FocusScope>
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
            variant="primary"
            isPending={save.pending}
            isDisabled={!plan || !row.raw.trim() || save.pending}
          >
            Add
          </Button>
          <Button
            type="button"
            variant="tertiary"
            isDisabled={save.pending}
            onPress={onClose}
          >
            Cancel
          </Button>
        </div>
      </form>
    </FocusScope>
  );
}
