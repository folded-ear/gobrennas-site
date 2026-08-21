import { useDraftForm } from "@/hooks/use-draft-form";
import {
  buildIngredientRef,
  buildOwnedSection,
  emptyRecipeFormValues,
  IngredientRefValues,
  OwnedSectionValues,
  recipeFormSchema,
  RecipeFormValues,
} from "./schema";

/**
 * Ingredients live in two places with identical UI — on the recipe, and on
 * each owned section. Every ingredient operation is parameterized by scope so
 * one component can serve both, rather than duplicating a section-flavored
 * copy of each one.
 */
export type IngredientScope =
  | { kind: "recipe" }
  | { kind: "section"; index: number };

export const RECIPE_SCOPE: IngredientScope = { kind: "recipe" };

/**
 * Dotted field names, built here so that the strings React Aria matches
 * validation errors against exist in exactly one place — they have to line up
 * with the paths Zod reports, and nothing checks that for us.
 */
export function sectionFieldName(
  index: number,
  field: "name" | "directions",
): string {
  return `sections.${index}.${field}`;
}

export function ingredientFieldName(
  scope: IngredientScope,
  index: number,
): string {
  const prefix = scope.kind === "recipe" ? "" : `sections.${scope.index}.`;
  return `${prefix}ingredients.${index}.raw`;
}

export function ingredientsIn(
  values: RecipeFormValues,
  scope: IngredientScope,
): IngredientRefValues[] {
  if (scope.kind === "recipe") return values.ingredients;
  const section = values.sections[scope.index];
  return section?.kind === "owned" ? section.ingredients : [];
}

type UseRecipeDraftOptions = {
  onSave: (values: RecipeFormValues) => void | Promise<void>;
  /** Defaults to a blank recipe. Edit mode will seed an existing one here. */
  initialValues?: () => RecipeFormValues;
};

export function useRecipeDraft({
  onSave,
  initialValues = emptyRecipeFormValues,
}: UseRecipeDraftOptions) {
  const form = useDraftForm({
    schema: recipeFormSchema,
    initialValues,
    onValid: onSave,
  });
  const { setValues } = form;

  function updateIngredients(
    scope: IngredientScope,
    fn: (list: IngredientRefValues[]) => IngredientRefValues[],
  ) {
    setValues((v) => {
      if (scope.kind === "recipe") {
        return { ...v, ingredients: fn(v.ingredients) };
      }
      return {
        ...v,
        sections: v.sections.map((s, i) =>
          i === scope.index && s.kind === "owned"
            ? { ...s, ingredients: fn(s.ingredients) }
            : s,
        ),
      };
    });
  }

  function addIngredient(scope: IngredientScope, afterIndex?: number) {
    updateIngredients(scope, (list) => {
      const next = list.slice();
      const at =
        afterIndex == null
          ? next.length
          : Math.min(Math.max(afterIndex + 1, 0), next.length);
      next.splice(at, 0, buildIngredientRef());
      return next;
    });
  }

  function removeIngredient(scope: IngredientScope, index: number) {
    updateIngredients(scope, (list) => list.filter((_, i) => i !== index));
  }

  function moveIngredient(scope: IngredientScope, from: number, to: number) {
    updateIngredients(scope, (list) => {
      if (from === to || from < 0 || from >= list.length) return list;
      const next = list.slice();
      const [moved] = next.splice(from, 1);
      next.splice(Math.min(Math.max(to, 0), next.length), 0, moved);
      return next;
    });
  }

  /**
   * Takes a patch rather than a whole ref: today a row only reports `raw`, but
   * server-side recognition will later write parsed fields back asynchronously.
   */
  function setIngredient(
    scope: IngredientScope,
    index: number,
    patch: Partial<IngredientRefValues>,
  ) {
    updateIngredients(scope, (list) =>
      list.map((ref, i) => (i === index ? { ...ref, ...patch } : ref)),
    );
  }

  /**
   * Splits pasted text into one ingredient per line. Pasting into an empty row
   * replaces it, rather than leaving a stray blank above the pasted block.
   */
  function pasteIngredients(
    scope: IngredientScope,
    index: number,
    text: string,
  ) {
    const added = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => buildIngredientRef(line));
    if (added.length === 0) return;
    updateIngredients(scope, (list) => {
      if (list.length === 0) return added;
      const at = Math.min(Math.max(index, 0), list.length - 1);
      const next = list.slice();
      if (next[at].raw.trim() === "") next.splice(at, 1, ...added);
      else next.splice(at + 1, 0, ...added);
      return next;
    });
  }

  function addOwnedSection() {
    setValues((v) => ({
      ...v,
      sections: [...v.sections, buildOwnedSection()],
    }));
  }

  function removeSection(index: number) {
    setValues((v) => ({
      ...v,
      sections: v.sections.filter((_, i) => i !== index),
    }));
  }

  function setSectionField<K extends "name" | "directions">(
    index: number,
    field: K,
    value: OwnedSectionValues[K],
  ) {
    setValues((v) => ({
      ...v,
      sections: v.sections.map((s, i) =>
        i === index && s.kind === "owned" ? { ...s, [field]: value } : s,
      ),
    }));
  }

  return {
    ...form,
    addIngredient,
    removeIngredient,
    moveIngredient,
    setIngredient,
    pasteIngredients,
    addOwnedSection,
    removeSection,
    setSectionField,
  };
}

export type RecipeDraft = ReturnType<typeof useRecipeDraft>;
