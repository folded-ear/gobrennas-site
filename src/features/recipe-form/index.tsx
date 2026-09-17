"use client";

import {
  Alert,
  Button,
  Description,
  FieldError,
  Form,
  Input,
  Label,
  Spinner,
  TextArea,
  TextField,
} from "@heroui/react";
import { FormEvent, useId, useRef, useState } from "react";
import {
  RecipeDraft,
  RecipeDraftErrors,
  validateRecipeDraft,
} from "./recipe-draft";

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
  const [draft, setDraft] = useState<RecipeDraft>(() => ({ ...initialDraft }));
  const [errors, setErrors] = useState<RecipeDraftErrors>({});
  const [hasSaveFailure, setHasSaveFailure] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const titleErrorId = useId();
  const yieldErrorId = useId();
  const totalTimeErrorId = useId();
  const caloriesErrorId = useId();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const yieldInputRef = useRef<HTMLInputElement>(null);
  const totalTimeInputRef = useRef<HTMLInputElement>(null);
  const caloriesInputRef = useRef<HTMLInputElement>(null);
  const isSubmittingRef = useRef(false);

  function handleFieldChange<Key extends keyof RecipeDraft>(
    field: Key,
    value: RecipeDraft[Key],
  ): void {
    setDraft((currentDraft) => ({ ...currentDraft, [field]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
    setHasSaveFailure(false);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (isSubmittingRef.current) {
      return;
    }

    const errors = validateRecipeDraft(draft);
    if (Object.keys(errors).length > 0) {
      setErrors(errors);

      if (errors.title !== undefined) {
        titleInputRef.current?.focus();
      } else if (errors.yieldServings !== undefined) {
        yieldInputRef.current?.focus();
      } else if (errors.totalTimeText !== undefined) {
        totalTimeInputRef.current?.focus();
      } else if (errors.caloriesPerServing !== undefined) {
        caloriesInputRef.current?.focus();
      }

      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setHasSaveFailure(false);

    try {
      await onSubmit(draft);
    } catch {
      setHasSaveFailure(true);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      aria-busy={isSubmitting}
      aria-label="Recipe details"
      className="flex w-full max-w-lg flex-col gap-lg"
      onSubmit={handleSubmit}
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

      <TextField
        isDisabled={isSubmitting}
        isInvalid={errors.title !== undefined}
        isRequired
        name="title"
        onChange={(value) => handleFieldChange("title", value)}
        value={draft.title}
      >
        <Label>Title</Label>
        <Input
          aria-errormessage={
            errors.title === undefined ? undefined : titleErrorId
          }
          ref={titleInputRef}
        />
        <FieldError id={titleErrorId}>{errors.title}</FieldError>
      </TextField>

      <TextField
        isDisabled={isSubmitting}
        name="sourceUrl"
        onChange={(value) => handleFieldChange("sourceUrl", value)}
        value={draft.sourceUrl}
      >
        <Label>Source URL</Label>
        <Input autoComplete="url" type="url" />
      </TextField>

      <div className="grid grid-cols-1 gap-lg sm:grid-cols-3">
        <TextField
          isDisabled={isSubmitting}
          isInvalid={errors.yieldServings !== undefined}
          name="yieldServings"
          onChange={(value) => handleFieldChange("yieldServings", value)}
          value={draft.yieldServings}
        >
          <Label>Yield</Label>
          <Input
            aria-errormessage={
              errors.yieldServings === undefined ? undefined : yieldErrorId
            }
            min={1}
            ref={yieldInputRef}
            step={1}
            type="number"
          />
          <FieldError id={yieldErrorId}>{errors.yieldServings}</FieldError>
        </TextField>

        <TextField
          isDisabled={isSubmitting}
          isInvalid={errors.totalTimeText !== undefined}
          name="totalTimeText"
          onChange={(value) => handleFieldChange("totalTimeText", value)}
          value={draft.totalTimeText}
        >
          <Label>Total cook time</Label>
          <Input
            aria-errormessage={
              errors.totalTimeText === undefined ? undefined : totalTimeErrorId
            }
            ref={totalTimeInputRef}
          />
          <Description>For example: 80 min or 1 hr 20 min.</Description>
          <FieldError id={totalTimeErrorId}>{errors.totalTimeText}</FieldError>
        </TextField>

        <TextField
          isDisabled={isSubmitting}
          isInvalid={errors.caloriesPerServing !== undefined}
          name="caloriesPerServing"
          onChange={(value) => handleFieldChange("caloriesPerServing", value)}
          value={draft.caloriesPerServing}
        >
          <Label>Calories per serving</Label>
          <Input
            aria-errormessage={
              errors.caloriesPerServing === undefined
                ? undefined
                : caloriesErrorId
            }
            min={0}
            ref={caloriesInputRef}
            step={1}
            type="number"
          />
          <FieldError id={caloriesErrorId}>
            {errors.caloriesPerServing}
          </FieldError>
        </TextField>
      </div>

      <TextField
        isDisabled={isSubmitting}
        name="directions"
        onChange={(value) => handleFieldChange("directions", value)}
        value={draft.directions}
      >
        <Label>Directions</Label>
        <TextArea rows={6} />
      </TextField>

      <div className="flex gap-sm">
        <Button
          isDisabled={isSubmitting}
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
