"use client";

import { FormTextField } from "@/components/form-text-field";
import { AlertDialog, Button } from "@heroui/react";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  Controller,
  useFieldArray,
  type Control,
  type UseFormGetValues,
} from "react-hook-form";
import type { RecognizeIngredient } from "./ingredient-recognition";
import { IngredientRows } from "./ingredient-rows";
import type { RecipeDraft } from "./recipe-draft";
import type { RecognitionQueue } from "./recognition-queue";
import { newSectionDraft } from "./section-draft";

export function OwnedSections({
  control,
  getValues,
  recognize,
  queue,
  isDisabled,
  onEdit,
}: {
  control: Control<RecipeDraft>;
  getValues: UseFormGetValues<RecipeDraft>;
  recognize: RecognizeIngredient;
  queue: RecognitionQueue;
  isDisabled: boolean;
  onEdit: () => void;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "sections",
    keyName: "formId",
  });
  const addButton = useRef<HTMLButtonElement>(null);
  const [removingSection, setRemovingSection] = useState<string>();

  function removeSection(index: number) {
    remove(index);
    onEdit();
    requestAnimationFrame(() => addButton.current?.focus());
  }

  return (
    <div className="flex flex-col gap-md">
      {fields.map((section, index) => (
        <fieldset
          key={section.clientId}
          disabled={isDisabled}
          className="flex min-w-0 flex-col gap-md rounded-lg border border-border p-md"
        >
          <legend className="px-xs font-medium">Section {index + 1}</legend>
          {section.referenceRecipeId ? (
            <p className="text-sm">
              <Link
                className="text-accent underline"
                href={`/recipes/${encodeURIComponent(section.referenceRecipeId)}`}
              >
                {section.title}
              </Link>{" "}
              — linked section
            </p>
          ) : (
            <>
              <FormTextField
                control={control}
                name={`sections.${index}.title`}
                label={`Section ${index + 1} title`}
                isRequired
                onValueChange={onEdit}
              />
              <div className="grid items-start gap-md @3xl:grid-cols-2">
                <Controller
                  control={control}
                  name={`sections.${index}.ingredients`}
                  render={({ field }) => (
                    <IngredientRows
                      labelPrefix={`Section ${index + 1} ingredient`}
                      rows={field.value}
                      queue={queue}
                      recognize={recognize}
                      isDisabled={isDisabled}
                      onChange={(rows, source) => {
                        field.onChange(
                          typeof rows === "function"
                            ? rows(getValues(`sections.${index}.ingredients`))
                            : rows,
                        );
                        if (source !== "recognition") onEdit();
                      }}
                    />
                  )}
                />
                <FormTextField
                  control={control}
                  name={`sections.${index}.directions`}
                  label={`Section ${index + 1} directions`}
                  multiline
                  rows={4}
                  onValueChange={onEdit}
                />
              </div>
            </>
          )}
          <AlertDialog
            isOpen={removingSection === section.clientId}
            onOpenChange={(open) => {
              if (!open) {
                setRemovingSection(undefined);
                return;
              }
              const current = getValues(`sections.${index}`);
              if (
                !current.title.trim() &&
                !current.directions.trim() &&
                current.ingredients.every((row) => !row.raw.trim())
              ) {
                removeSection(index);
              } else {
                setRemovingSection(section.clientId);
              }
            }}
          >
            <Button
              aria-label={`Remove section ${index + 1}`}
              className="self-start"
              isDisabled={isDisabled}
              type="button"
              variant="tertiary"
            >
              Remove section
            </Button>
            <AlertDialog.Backdrop isKeyboardDismissDisabled={false}>
              <AlertDialog.Container size="sm">
                <AlertDialog.Dialog>
                  {({ close }) => (
                    <>
                      <AlertDialog.Header>
                        <AlertDialog.Heading>
                          Remove this section?
                        </AlertDialog.Heading>
                      </AlertDialog.Header>
                      <AlertDialog.Body>
                        The section and its ingredients will be removed from
                        this draft. Changes are applied when you save the
                        recipe.
                      </AlertDialog.Body>
                      <AlertDialog.Footer>
                        <Button
                          autoFocus
                          type="button"
                          variant="secondary"
                          onPress={close}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          isDisabled={isDisabled}
                          onPress={() => {
                            close();
                            removeSection(index);
                          }}
                        >
                          Remove section
                        </Button>
                      </AlertDialog.Footer>
                    </>
                  )}
                </AlertDialog.Dialog>
              </AlertDialog.Container>
            </AlertDialog.Backdrop>
          </AlertDialog>
        </fieldset>
      ))}
      <Button
        ref={addButton}
        className="self-start"
        type="button"
        variant="secondary"
        isDisabled={isDisabled}
        onPress={() => {
          append(newSectionDraft(), {
            focusName: `sections.${fields.length}.title`,
          });
          onEdit();
        }}
      >
        <Plus aria-hidden="true" size={16} /> Add section
      </Button>
    </div>
  );
}
