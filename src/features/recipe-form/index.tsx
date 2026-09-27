"use client";

import { FormTextField } from "@/components/form-text-field";
import { Alert, Button, Form, Spinner } from "@heroui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState, type FormEvent } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { IngredientRows } from "./ingredient-rows";
import { recipeDraftSchema, type RecipeDraft } from "./recipe-draft";

type RecipeFormProps = {
  initialDraft: RecipeDraft;
  onSubmit: (draft: RecipeDraft) => Promise<void>;
  onCancel: () => void;
};

export function RecipeForm({
  initialDraft,
  onSubmit,
  onCancel,
}: RecipeFormProps) {
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<RecipeDraft>({
    defaultValues: initialDraft,
    resolver: zodResolver(recipeDraftSchema, undefined, { raw: true }),
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const title = useWatch({ control, name: "title" });
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
      className="flex w-full max-w-lg flex-col gap-lg"
      onSubmit={handleFormSubmit}
      validationBehavior="aria"
    >
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

      <div className="grid grid-cols-1 gap-lg sm:grid-cols-3">
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

      <Controller
        control={control}
        name="ingredients"
        render={({ field }) => (
          <IngredientRows
            rows={field.value}
            onChange={(rows) => {
              field.onChange(rows);
              clearSaveFailure();
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
        rows={6}
        onValueChange={clearSaveFailure}
      />

      <div className="flex gap-sm">
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
    </Form>
  );
}
