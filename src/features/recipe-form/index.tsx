"use client";

import { AddIcon } from "@/components/icons";
import { useMutation } from "@apollo/client/react";
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
import { CreateRecipeDocument } from "./__generated__/createRecipe.generated";
import { IngredientRows } from "./ingredient-rows";
import { SectionEditor } from "./section-editor";
import { toIngredientInfo } from "./to-ingredient-info";
import { RECIPE_SCOPE, useRecipeDraft } from "./use-recipe-draft";

type RecipeFormProps = {
  onSaved: (id: string) => void;
  onCancel: () => void;
};

export function RecipeForm({ onSaved, onCancel }: RecipeFormProps) {
  const [createRecipe] = useMutation(CreateRecipeDocument);
  const draft = useRecipeDraft({
    onSave: async (recipe) => {
      const { data } = await createRecipe({
        variables: { info: toIngredientInfo(recipe) },
      });
      onSaved(data!.library.createRecipe.id);
    },
  });
  const { values, setField, fieldErrors, submitError, isSubmitting } = draft;

  return (
    <Form
      validationBehavior="aria"
      validationErrors={fieldErrors}
      onSubmit={draft.handleSubmit}
      className="flex flex-col gap-lg"
    >
      {submitError && (
        <Alert status="danger">
          <Alert.Content>
            <Alert.Title>Unable to save recipe</Alert.Title>
            <Alert.Description>{submitError}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}
      <TextField
        name="name"
        isRequired
        value={values.name}
        onChange={(value) => setField("name", value)}
      >
        <Label>Title</Label>
        <Input placeholder="Recipe Title" />
        <FieldError />
      </TextField>
      <IngredientRows
        draft={draft}
        scope={RECIPE_SCOPE}
        label="Ingredient"
        placeholder="1 cup onion, diced fine"
      />
      {values.sections.map((section, index) => (
        <SectionEditor key={section.clientId} draft={draft} index={index} />
      ))}
      <div>
        <Button
          type="button"
          variant="tertiary"
          onPress={draft.addOwnedSection}
        >
          <AddIcon size="small" />
          Add Section
        </Button>
      </div>
      <TextField
        name="directions"
        value={values.directions}
        onChange={(value) => setField("directions", value)}
      >
        <Label>Directions</Label>
        <TextArea placeholder="Recipe Directions" rows={8} />
        <FieldError />
      </TextField>
      <div className="flex gap-md">
        <Button type="submit" isPending={isSubmitting}>
          {({ isPending }) => (
            <>
              {isPending && <Spinner color="current" size="sm" />}
              {isPending ? "Saving..." : "Save"}
            </>
          )}
        </Button>
        <Button type="button" variant="tertiary" onPress={onCancel}>
          Cancel
        </Button>
      </div>
    </Form>
  );
}
