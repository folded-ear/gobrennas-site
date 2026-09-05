"use client";

import { AddIcon, DeleteIcon } from "@/components/icons";
import { Button } from "@heroui/react";
import { IngredientRow } from "./ingredient-row";
import {
  ingredientFieldName,
  IngredientScope,
  ingredientsIn,
  RecipeDraft,
} from "./use-recipe-draft";

type IngredientRowsProps = {
  draft: RecipeDraft;
  scope: IngredientScope;
  /** Distinguishes this list's rows for assistive tech; must be unique on the page. */
  label: string;
  placeholder?: string;
};

/**
 * Used verbatim for the recipe's own ingredients and for each owned section's
 * — the only difference between the two call sites is `scope`.
 */
export function IngredientRows({
  draft,
  scope,
  label,
  placeholder,
}: IngredientRowsProps) {
  const ingredients = ingredientsIn(draft.values, scope);

  return (
    <div className="flex flex-col gap-xs">
      <ul className="flex flex-col gap-xs">
        {ingredients.map((ingredient, i) => (
          <li key={ingredient.clientId} className="flex items-center gap-xs">
            <IngredientRow
              name={ingredientFieldName(scope, i)}
              label={`${label} ${i + 1}`}
              value={ingredient.raw}
              placeholder={i === 0 ? placeholder : undefined}
              onChange={(raw) => draft.setIngredient(scope, i, { raw })}
              onPressEnter={() => draft.addIngredient(scope, i)}
              onDelete={() => draft.removeIngredient(scope, i)}
              onMultilinePaste={(text) =>
                draft.pasteIngredients(scope, i, text)
              }
            />
            <Button
              type="button"
              variant="ghost"
              isIconOnly
              aria-label={`Remove ${label} ${i + 1}`}
              onPress={() => draft.removeIngredient(scope, i)}
            >
              <DeleteIcon size="small" />
            </Button>
          </li>
        ))}
      </ul>
      <div>
        <Button
          type="button"
          variant="tertiary"
          size="sm"
          onPress={() => draft.addIngredient(scope)}
        >
          <AddIcon size="small" />
          {`Add ${label}`}
        </Button>
      </div>
    </div>
  );
}
