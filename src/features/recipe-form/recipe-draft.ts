import type { IngredientInfo } from "@/__generated__/graphql";

export type RecipeDraft = {
  title: string;
  directions: string;
};

export type RecipeDraftErrors = {
  title?: string;
};

export function newRecipeDraft(): RecipeDraft {
  return { title: "", directions: "" };
}

export function validateRecipeDraft(draft: RecipeDraft): RecipeDraftErrors {
  if (draft.title.trim().length === 0) {
    return { title: "A recipe title is required." };
  }

  return {};
}

export function toIngredientInfo(draft: RecipeDraft): IngredientInfo {
  return {
    type: "Recipe",
    name: draft.title.trim(),
    directions: draft.directions,
  };
}
