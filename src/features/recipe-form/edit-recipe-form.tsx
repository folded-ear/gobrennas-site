"use client";

import { useApolloClient, useMutation, useQuery } from "@apollo/client/react";
import { Alert, Button } from "@heroui/react";
import { useState } from "react";
import { CreateRecipeFromDocument } from "./__generated__/createRecipeFrom.generated";
import { GetRecipeForEditDocument } from "./__generated__/getRecipeForEdit.generated";
import { UpdateRecipeDocument } from "./__generated__/updateRecipe.generated";
import { RecipeEditLoading } from "./edit-loading";
import {
  recipeToDraft,
  toRecipeCopy,
  toRecipeUpdate,
  type EditableRecipe,
} from "./edit-recipe-draft";
import { RecipeForm, type RecipeFormAdditions } from "./index";
import type { RecipeDraft } from "./recipe-draft";
import { useDeleteRecipe } from "./use-delete-recipe";
import { useRecipeFormServices } from "./use-recipe-form-services";

type Props = RecipeFormAdditions & {
  id: string;
  copy?: boolean;
  onSaved: (id: string) => void | Promise<void>;
  onCancel: () => void;
  onDeleted: () => void;
};

export function EditRecipeForm({
  id,
  copy = false,
  onSaved,
  onCancel,
  onDeleted,
  ...additions
}: Props) {
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
  return (
    <LoadedRecipeEditor
      key={`${recipe.id}:${copy || !recipe.mine}`}
      copy={copy || !recipe.mine}
      recipe={recipe}
      onSaved={onSaved}
      onCancel={onCancel}
      onDeleted={onDeleted}
      {...additions}
    />
  );
}

function LoadedRecipeEditor({
  recipe,
  copy,
  onSaved,
  onCancel,
  onDeleted,
  ...additions
}: Omit<Props, "id"> & { recipe: EditableRecipe }) {
  // A background cache change must not overwrite edits or replace row identities.
  const [snapshot] = useState(() => ({ recipe, draft: recipeToDraft(recipe) }));
  const client = useApolloClient();
  const services = useRecipeFormServices();
  const [updateRecipe] = useMutation(UpdateRecipeDocument);
  const [createRecipeFrom] = useMutation(CreateRecipeFromDocument);
  const remove = useDeleteRecipe(snapshot.recipe, onDeleted);
  async function submit(draft: RecipeDraft, asCopy = copy) {
    let savedId: string;
    if (asCopy) {
      const info = toRecipeCopy(draft, snapshot.draft, snapshot.recipe);
      const result = await createRecipeFrom({
        variables: { sourceRecipeId: recipe.id, info },
      });
      const id = result.data?.library.createRecipeFrom.id;
      if (!id || id === recipe.id)
        throw new Error("Copy returned no new recipe.");
      savedId = id;
    } else {
      if (!recipe.mine) throw new Error("Recipe is not editable.");
      const info = toRecipeUpdate(draft, snapshot.draft, snapshot.recipe);
      const result = await updateRecipe({ variables: { id: recipe.id, info } });
      if (result.data?.library.updateRecipe.id !== recipe.id)
        throw new Error("Update returned no matching recipe.");
      savedId = recipe.id;
    }
    client.cache.batch({
      update(cache) {
        for (const item of asCopy
          ? []
          : [
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
    await onSaved(savedId);
  }
  return (
    <RecipeForm
      heading={copy ? "Copy Recipe" : "Edit Recipe"}
      saveLabel={copy ? "Save copy" : "Save recipe"}
      initialDraft={snapshot.draft}
      existingPhoto={snapshot.recipe.photo ?? undefined}
      {...services}
      {...additions}
      onSubmit={submit}
      onSaveCopy={copy ? undefined : (draft) => submit(draft, true)}
      onCancel={onCancel}
      onDelete={copy ? undefined : remove}
    />
  );
}
