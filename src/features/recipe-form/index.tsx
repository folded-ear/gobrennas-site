"use client";

import { FormTextField } from "@/components/form-text-field";
import { SectionHeader } from "@/components/section-header";
import { LabelEditor, type LabelSuggestions } from "@/features/label-editor";
import { Alert, Button, Form, Spinner } from "@heroui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState, type FormEvent } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import type { RecognizeIngredient } from "./ingredient-recognition";
import { IngredientRows } from "./ingredient-rows";
import { OwnedSections } from "./owned-sections";
import { recipeDraftSchema, type RecipeDraft } from "./recipe-draft";
import { createRecognitionQueue } from "./recognition-queue";

type RecipeFormProps = {
  heading: string;
  initialDraft: RecipeDraft;
  onSubmit: (draft: RecipeDraft) => Promise<void>;
  onCancel: () => void;
  recognizeIngredient: RecognizeIngredient;
  labelSuggestions?: LabelSuggestions;
};

export function RecipeForm({
  heading,
  initialDraft,
  onSubmit,
  onCancel,
  recognizeIngredient,
  labelSuggestions,
}: RecipeFormProps) {
  const {
    control,
    handleSubmit,
    getValues,
    formState: { isSubmitting },
  } = useForm<RecipeDraft>({
    defaultValues: initialDraft,
    resolver: zodResolver(recipeDraftSchema, undefined, { raw: true }),
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const title = useWatch({ control, name: "title" });
  const [recognitionQueue] = useState(createRecognitionQueue);
  const [hasSaveFailure, setHasSaveFailure] = useState(false);
  const isSubmittingRef = useRef(false);

  function clearSaveFailure(): void {
    setHasSaveFailure(false);
  }

  async function submitRecipe(draft: RecipeDraft): Promise<void> {
    clearSaveFailure();
    try {
      await onSubmit(draft);
    } catch {
      setHasSaveFailure(true);
    }
  }

  async function handleFormSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (isSubmittingRef.current) {
      return;
    }
    // Acquire before async validation, so two submissions cannot race.
    isSubmittingRef.current = true;
    try {
      await handleSubmit(submitRecipe)(event);
    } finally {
      isSubmittingRef.current = false;
    }
  }

  return (
    <Form
      aria-busy={isSubmitting}
      aria-label="Recipe details"
      className="flex w-full flex-col gap-0"
      onSubmit={handleFormSubmit}
      validationBehavior="aria"
    >
      <SectionHeader title={heading}>
        <div className="flex shrink-0 gap-sm">
          <Button
            isDisabled={isSubmitting || title.trim().length === 0}
            isPending={isSubmitting}
            type="submit"
            variant="primary"
          >
            {isSubmitting ? (
              <>
                <Spinner aria-label="Saving recipe" color="current" size="sm" />
                Saving…
              </>
            ) : (
              "Save recipe"
            )}
          </Button>
          <Button
            isDisabled={isSubmitting}
            onPress={onCancel}
            type="button"
            variant="secondary"
          >
            Cancel
          </Button>
        </div>
      </SectionHeader>
      <div className="@container flex w-full max-w-5xl flex-col gap-md p-md">
        {hasSaveFailure ? (
          <Alert role="alert" status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Couldn’t save recipe</Alert.Title>
              <Alert.Description>
                Your recipe is still here. Try saving again.
              </Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        <div className="grid gap-md @2xl:grid-cols-2">
          <FormTextField
            control={control}
            name="title"
            label="Title"
            isRequired
            onValueChange={clearSaveFailure}
          />
          <FormTextField
            control={control}
            name="sourceUrl"
            label="Source URL"
            type="url"
            autoComplete="url"
            onValueChange={clearSaveFailure}
          />
        </div>

        <div className="grid grid-cols-1 gap-md @lg:grid-cols-3">
          <FormTextField
            control={control}
            name="yieldServings"
            label="Yield"
            type="number"
            min={1}
            step={1}
            onValueChange={clearSaveFailure}
          />
          <FormTextField
            control={control}
            name="totalTimeText"
            label="Total cook time"
            description="For example: 80 min or 1 hr 20 min."
            onValueChange={clearSaveFailure}
          />
          <FormTextField
            control={control}
            name="caloriesPerServing"
            label="Calories per serving"
            type="number"
            min={0}
            step={1}
            onValueChange={clearSaveFailure}
          />
        </div>

        <div className="grid items-start gap-md @3xl:grid-cols-2">
          <Controller
            control={control}
            name="ingredients"
            render={({ field }) => (
              <IngredientRows
                rows={field.value}
                queue={recognitionQueue}
                recognize={recognizeIngredient}
                onChange={(rows, source) => {
                  field.onChange(
                    typeof rows === "function"
                      ? rows(getValues("ingredients"))
                      : rows,
                  );
                  if (source !== "recognition") clearSaveFailure();
                }}
                isDisabled={isSubmitting}
              />
            )}
          />

          <FormTextField
            control={control}
            name="directions"
            label="Directions"
            multiline
            rows={4}
            onValueChange={clearSaveFailure}
          />
        </div>

        <Controller
          control={control}
          name="labels"
          render={({ field }) => (
            <LabelEditor
              value={field.value}
              onChange={field.onChange}
              onEdit={clearSaveFailure}
              isDisabled={isSubmitting}
              suggestions={labelSuggestions}
            />
          )}
        />

        <OwnedSections
          control={control}
          getValues={getValues}
          recognize={recognizeIngredient}
          queue={recognitionQueue}
          isDisabled={isSubmitting}
          onEdit={clearSaveFailure}
        />
      </div>
    </Form>
  );
}
