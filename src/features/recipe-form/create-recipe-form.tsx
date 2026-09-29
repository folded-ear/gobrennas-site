"use client";

import { useApolloClient, useMutation } from "@apollo/client/react";
import { useCallback } from "react";
import { CreateRecipeDocument } from "./__generated__/createRecipe.generated";
import { RecognizeIngredientDocument } from "./__generated__/recognizeIngredient.generated";
import { RecipeForm } from "./index";
import {
  ingredientRecognitionSchema,
  type RecognizeIngredient,
} from "./ingredient-recognition";
import {
  newRecipeDraft,
  toIngredientInfo,
  type RecipeDraft,
} from "./recipe-draft";

type CreateRecipeFormProps = {
  onCreated: (id: string) => void | Promise<void>;
  onCancel: () => void;
};

export function CreateRecipeForm({
  onCreated,
  onCancel,
}: CreateRecipeFormProps) {
  const client = useApolloClient();
  const [createRecipe] = useMutation(CreateRecipeDocument);

  const recognizeIngredient = useCallback<RecognizeIngredient>(
    async (raw, cursor, signal, options) => {
      const result = await client.query({
        query: RecognizeIngredientDocument,
        variables: {
          raw,
          cursor,
          suggest: options?.suggest ?? false,
          choice: options?.choice
            ? { id: options.choice.food.id, ...options.choice.range }
            : null,
        },
        fetchPolicy: "no-cache",
        context: { queryDeduplication: false, fetchOptions: { signal } },
      });
      return ingredientRecognitionSchema.parse(
        result.data?.library.recognizeItem,
      );
    },
    [client],
  );

  async function submitRecipe(draft: RecipeDraft): Promise<void> {
    const result = await createRecipe({
      variables: { info: toIngredientInfo(draft) },
    });
    const recipeId = result.data?.library.createRecipe.id;

    if (!recipeId) {
      throw new Error("Create recipe mutation returned no recipe id.");
    }

    client.cache.evict({ id: "ROOT_QUERY", fieldName: "library" });
    await onCreated(recipeId);
  }

  return (
    <RecipeForm
      heading="Add Recipe"
      initialDraft={newRecipeDraft()}
      onSubmit={submitRecipe}
      recognizeIngredient={recognizeIngredient}
      onCancel={onCancel}
    />
  );
}
