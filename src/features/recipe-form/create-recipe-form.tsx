"use client";

import { useApolloClient, useMutation } from "@apollo/client/react";
import { CreateRecipeDocument } from "./__generated__/createRecipe.generated";
import { RecipeForm } from "./index";
import {
  newRecipeDraft,
  toIngredientInfo,
  type RecipeDraft,
} from "./recipe-draft";
import { useRecipeFormServices } from "./use-recipe-form-services";

type CreateRecipeFormProps = {
  onCreated: (id: string) => void | Promise<void>;
  onCancel: () => void;
};

export function CreateRecipeForm({
  onCreated,
  onCancel,
}: CreateRecipeFormProps) {
  const client = useApolloClient();
  const [createRecipe] = useMutation(CreateRecipeDocument, {
    context: { failureToast: false },
  });
  const services = useRecipeFormServices();

  async function submitRecipe(draft: RecipeDraft): Promise<void> {
    const result = await createRecipe({
      variables: { info: toIngredientInfo(draft) },
    });
    const recipeId = result.data?.library.createRecipe.id;

    if (!recipeId) {
      throw new Error("Create recipe mutation returned no recipe id.");
    }

    client.cache.evict({ id: "ROOT_QUERY", fieldName: "library" });
    client.cache.evict({ id: "ROOT_QUERY", fieldName: "labels" });
    await onCreated(recipeId);
  }

  return (
    <RecipeForm
      heading="Add Recipe"
      initialDraft={newRecipeDraft()}
      onSubmit={submitRecipe}
      {...services}
      onCancel={onCancel}
    />
  );
}
