"use client";

import {
  Alert,
  Button,
  FieldError,
  Form,
  Input,
  Label,
  Spinner,
  TextArea,
  TextField,
} from "@heroui/react";
import { FormEvent, useId, useRef, useState } from "react";
import { RecipeDraft, validateRecipeDraft } from "./recipe-draft";

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
  const [titleError, setTitleError] = useState<string>();
  const [hasSaveFailure, setHasSaveFailure] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const titleErrorId = useId();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const isSubmittingRef = useRef(false);

  function handleTitleChange(title: string): void {
    setDraft((currentDraft) => ({ ...currentDraft, title }));
    setTitleError(undefined);
    setHasSaveFailure(false);
  }

  function handleDirectionsChange(directions: string): void {
    setDraft((currentDraft) => ({ ...currentDraft, directions }));
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
    if (errors.title !== undefined) {
      setTitleError(errors.title);
      titleInputRef.current?.focus();
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
        isInvalid={titleError !== undefined}
        isRequired
        name="title"
        onChange={handleTitleChange}
        value={draft.title}
      >
        <Label>Title</Label>
        <Input
          aria-errormessage={
            titleError === undefined ? undefined : titleErrorId
          }
          ref={titleInputRef}
        />
        <FieldError id={titleErrorId}>{titleError}</FieldError>
      </TextField>

      <TextField
        isDisabled={isSubmitting}
        name="directions"
        onChange={handleDirectionsChange}
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
