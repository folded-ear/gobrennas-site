import type { IngredientInfo } from "@/__generated__/graphql";
import type { GetRecipeForEditQuery } from "./__generated__/getRecipeForEdit.generated";
import { type IngredientDraft, newIngredientDraft } from "./ingredient-draft";
import { type RecipeDraft, toIngredientInfo } from "./recipe-draft";

export type EditableRecipe = GetRecipeForEditQuery["library"]["getRecipeById"];

export class RecipeFormError extends Error {}

function ingredientRows(
  rows: EditableRecipe["ingredients"],
): IngredientDraft[] {
  return rows.length
    ? rows.map((row) => ({
        ...newIngredientDraft(row.raw),
        persisted: {
          raw: row.raw,
          quantity: row.quantity?.quantity ?? null,
          uomId: row.quantity?.units?.id ?? null,
          ingredientId: row.ingredient?.id ?? null,
          preparation: row.preparation ?? null,
        },
      }))
    : [newIngredientDraft()];
}

export function recipeToDraft(recipe: EditableRecipe): RecipeDraft {
  const owned = new Set<string>();
  return {
    title: recipe.name,
    sourceUrl: recipe.externalUrl ?? "",
    yieldServings: recipe.yield == null ? "" : String(recipe.yield),
    // Keep exact stored milliseconds in the baseline; the editor uses minutes.
    totalTimeText:
      recipe.totalTime == null
        ? ""
        : String(Math.floor(recipe.totalTime / 60_000)),
    caloriesPerServing: recipe.calories == null ? "" : String(recipe.calories),
    directions: recipe.directions ?? "",
    labels: [...(recipe.labels ?? [])],
    ingredients: ingredientRows(recipe.ingredients),
    sections: recipe.sections.map((section) => {
      const isOwned =
        section.sectionOf?.id === recipe.id && !owned.has(section.id);
      if (isOwned) owned.add(section.id);
      return {
        clientId: crypto.randomUUID(),
        id: section.id,
        title: section.name,
        directions: section.directions ?? "",
        labels: [...(section.labels ?? [])],
        ingredients: isOwned ? ingredientRows(section.ingredients) : [],
        ...(isOwned
          ? {}
          : { referenceRecipeId: section.sectionOf?.id ?? section.id }),
      };
    }),
  };
}

/** Preserve stored values for untouched fields, including precision and nulls. */
export function toRecipeUpdate(
  draft: RecipeDraft,
  initial: RecipeDraft,
  recipe: EditableRecipe,
): IngredientInfo {
  const serialized = toIngredientInfo(draft);
  const info: IngredientInfo = {
    ...serialized,
    ...(draft.title === initial.title ? { name: recipe.name } : {}),
    ...(draft.sourceUrl === initial.sourceUrl
      ? { externalUrl: recipe.externalUrl }
      : {}),
    ...(draft.yieldServings === initial.yieldServings
      ? { yield: recipe.yield }
      : {}),
    ...(draft.totalTimeText === initial.totalTimeText
      ? { totalTime: recipe.totalTime }
      : {}),
    ...(draft.caloriesPerServing === initial.caloriesPerServing
      ? { calories: recipe.calories }
      : {}),
    ...(draft.directions === initial.directions
      ? { directions: recipe.directions }
      : {}),
    ...(JSON.stringify(draft.labels) === JSON.stringify(initial.labels)
      ? { labels: recipe.labels ?? [] }
      : {}),
    sections: serialized.sections?.map((section, index) => {
      const current = draft.sections[index];
      const before = initial.sections.find(
        (item) => item.clientId === current.clientId,
      );
      const saved = recipe.sections.find((item) => item.id === current.id);
      if (!before || !saved || current.referenceRecipeId) return section;
      return {
        ...section,
        ...(current.title === before.title ? { name: saved.name } : {}),
        ...(current.directions === before.directions
          ? { directions: saved.directions }
          : {}),
      };
    }),
  };
  const ownedIds = new Set(
    recipe.sections
      .filter((s) => s.sectionOf?.id === recipe.id)
      .map((s) => s.id),
  );
  const retainedIds = new Set(info.sections?.map((s) => s.id));
  const rows = [
    ...(info.ingredients ?? []),
    ...(info.sections ?? []).flatMap((s) => s.ingredients ?? []),
  ];
  for (const row of rows) {
    if (
      row.ingredientId &&
      ownedIds.has(row.ingredientId) &&
      !retainedIds.has(row.ingredientId)
    ) {
      throw new RecipeFormError(
        "This section is still used by an ingredient. Remove that ingredient reference before removing the section.",
      );
    }
  }
  return info;
}
