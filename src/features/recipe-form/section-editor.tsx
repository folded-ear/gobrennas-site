"use client";

import { DeleteIcon } from "@/components/icons";
import {
  Button,
  FieldError,
  Input,
  Label,
  TextArea,
  TextField,
} from "@heroui/react";
import { IngredientRows } from "./ingredient-rows";
import { RecipeDraft, sectionFieldName } from "./use-recipe-draft";

type SectionEditorProps = {
  draft: RecipeDraft;
  index: number;
};

export function SectionEditor({ draft, index }: SectionEditorProps) {
  const section = draft.values.sections[index];
  if (!section) return null;

  const ordinal = index + 1;
  const removeButton = (
    <Button
      type="button"
      variant="ghost"
      isIconOnly
      aria-label={`Remove section ${ordinal}`}
      onPress={() => draft.removeSection(index)}
    >
      <DeleteIcon size="small" />
    </Button>
  );

  // A section that _is_ another recipe: nothing here is editable, which is
  // why the required-title rule never applies to it.
  if (section.kind === "reference") {
    return (
      <div className="flex items-center justify-between gap-md rounded-md bg-surface p-md">
        <div>
          <h3 className="text-lg">{section.name}</h3>
          <p className="text-sm text-muted">{`of ${section.ofRecipeName}`}</p>
        </div>
        {removeButton}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-md rounded-md bg-surface p-md">
      <div className="flex items-end justify-between gap-md">
        <TextField
          name={sectionFieldName(index, "name")}
          isRequired
          value={section.name}
          onChange={(value) => draft.setSectionField(index, "name", value)}
          className="flex-1"
        >
          <Label>{`Section ${ordinal} title`}</Label>
          <Input placeholder="Salad Dressing" />
          <FieldError />
        </TextField>
        {removeButton}
      </div>
      <IngredientRows
        draft={draft}
        scope={{ kind: "section", index }}
        label={`Section ${ordinal} ingredient`}
        placeholder="½ c olive oil"
      />
      <TextField
        name={sectionFieldName(index, "directions")}
        value={section.directions}
        onChange={(value) => draft.setSectionField(index, "directions", value)}
      >
        <Label>{`Section ${ordinal} directions`}</Label>
        <TextArea rows={3} />
        <FieldError />
      </TextField>
    </div>
  );
}
