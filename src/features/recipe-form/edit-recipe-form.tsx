"use client";

import { useApolloClient, useMutation, useQuery } from "@apollo/client/react";
import { Alert, Button } from "@heroui/react";
import { useState } from "react";
import { GetRecipeForEditDocument } from "./__generated__/getRecipeForEdit.generated";
import { UpdateRecipeDocument } from "./__generated__/updateRecipe.generated";
import { RecipeEditLoading } from "./edit-loading";
import {
  recipeToDraft,
  toRecipeUpdate,
  type EditableRecipe,
} from "./edit-recipe-draft";
import { RecipeForm } from "./index";
import type { RecipeDraft } from "./recipe-draft";
import { useRecipeFormServices } from "./use-recipe-form-services";

type Props = {
  id: string;
  onSaved: (id: string) => void | Promise<void>;
  onCancel: () => void;
};

export function EditRecipeForm({ id, onSaved, onCancel }: Props) {
  // Fetch a complete fresh snapshot, independent of the partial detail/card cache.
  const query = useQuery(GetRecipeForEditDocument, {
    variables: { id },
    fetchPolicy: "no-cache",
  });
  if (query.loading) return <RecipeEditLoading />;
  if (query.error || !query.data)
    return (
      <div className="flex flex-col gap-md p-md">
        <Alert status="danger" role="alert">
          <Alert.Content>
            <Alert.Title>Couldn’t load recipe</Alert.Title>
            <Alert.Description>
              Try again, or return to the recipe.
            </Alert.Description>
          </Alert.Content>
        </Alert>
        <div className="flex gap-sm">
          <Button
            onPress={() => {
              void query.refetch().catch(() => {
                /* Query displays the error. */
              });
            }}
          >
            Retry
          </Button>
          <Button variant="secondary" onPress={onCancel}>
            Back to recipe
          </Button>
        </div>
      </div>
    );
  const recipe = query.data.library.getRecipeById;
  if (!recipe.mine)
    return (
      <div className="flex flex-col gap-md p-md">
        <p role="alert">
          You can view this recipe, but only its owner can edit it.
        </p>
        <Button onPress={onCancel}>Back to recipe</Button>
      </div>
    );
  return (
    <LoadedRecipeEditor
      key={recipe.id}
      recipe={recipe}
      onSaved={onSaved}
      onCancel={onCancel}
    />
  );
}

function LoadedRecipeEditor({
  recipe,
  onSaved,
  onCancel,
}: Omit<Props, "id"> & { recipe: EditableRecipe }) {
  // A background cache change must not overwrite edits or replace row identities.
  const [snapshot] = useState(() => ({ recipe, draft: recipeToDraft(recipe) }));
  const client = useApolloClient();
  const services = useRecipeFormServices();
  const [updateRecipe] = useMutation(UpdateRecipeDocument);
  async function submit(draft: RecipeDraft) {
    if (!recipe.mine) throw new Error("Recipe is not editable.");
    const info = toRecipeUpdate(draft, snapshot.draft, snapshot.recipe);
    const result = await updateRecipe({ variables: { id: recipe.id, info } });
    if (result.data?.library.updateRecipe.id !== recipe.id)
      throw new Error("Update returned no matching recipe.");
    client.cache.batch({
      update(cache) {
        for (const item of [
          snapshot.recipe,
          ...snapshot.recipe.sections.filter(
            (s) => s.sectionOf?.id === recipe.id,
          ),
        ]) {
          const id = cache.identify(item);
          if (id) cache.evict({ id });
        }
        cache.evict({ id: "ROOT_QUERY", fieldName: "library" });
        cache.evict({ id: "ROOT_QUERY", fieldName: "labels" });
      },
    });
    await onSaved(recipe.id);
  }
  return (
    <RecipeForm
      heading="Edit Recipe"
      initialDraft={snapshot.draft}
      existingPhoto={snapshot.recipe.photo ?? undefined}
      {...services}
      onSubmit={submit}
      onCancel={onCancel}
    />
  );
}
