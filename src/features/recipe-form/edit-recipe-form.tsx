"use client";

import { isReference, type NormalizedCacheObject } from "@apollo/client";
import { useApolloClient, useMutation, useQuery } from "@apollo/client/react";
import { Alert, Button } from "@heroui/react";
import { useState } from "react";
import { DeleteRecipeDocument } from "./__generated__/deleteRecipe.generated";
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
  onDeleted: () => void;
};

export function EditRecipeForm({ id, onSaved, onCancel, onDeleted }: Props) {
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
      onDeleted={onDeleted}
    />
  );
}

function LoadedRecipeEditor({
  recipe,
  onSaved,
  onCancel,
  onDeleted,
}: Omit<Props, "id"> & { recipe: EditableRecipe }) {
  // A background cache change must not overwrite edits or replace row identities.
  const [snapshot] = useState(() => ({ recipe, draft: recipeToDraft(recipe) }));
  const client = useApolloClient();
  const services = useRecipeFormServices();
  const [updateRecipe] = useMutation(UpdateRecipeDocument);
  const [deleteRecipe] = useMutation(DeleteRecipeDocument);
  async function remove() {
    if (!recipe.mine) throw new Error("Recipe is not deletable.");
    const result = await deleteRecipe({ variables: { id: recipe.id } });
    if (result.data?.library.deleteRecipe.id !== recipe.id)
      throw new Error("Delete returned no matching recipe.");
    client.cache.batch({
      update(cache) {
        const deletedIds = new Set(
          [
            snapshot.recipe,
            ...snapshot.recipe.sections.filter(
              (section) => section.sectionOf?.id === recipe.id,
            ),
          ]
            .map((item) => cache.identify(item))
            .filter((id) => id !== undefined),
        );
        // The API keeps plan entries but severs their recipe link and may fill
        // empty notes. Keep their local editing state while refreshing these fields.
        // Apollo's generic cache interface erases the InMemoryCache store type.
        const store = cache.extract() as NormalizedCacheObject;
        for (const [id, item] of Object.entries(store)) {
          if (
            item?.__typename === "PlanItem" &&
            isReference(item.ingredient) &&
            deletedIds.has(item.ingredient.__ref)
          ) {
            cache.evict({ id, fieldName: "ingredient" });
            cache.evict({ id, fieldName: "notes" });
          }
        }
        for (const id of deletedIds) cache.evict({ id });
        for (const fieldName of ["library", "labels", "planner"]) {
          cache.evict({ id: "ROOT_QUERY", fieldName });
        }
      },
    });
    onDeleted();
  }
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
      onDelete={remove}
    />
  );
}
