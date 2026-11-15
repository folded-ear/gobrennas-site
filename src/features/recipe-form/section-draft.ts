import { z } from "zod";
import { ingredientDraftSchema, newIngredientDraft } from "./ingredient-draft";
import type { BorrowableSection } from "./use-section-search";

export const sectionDraftSchema = z.object({
  clientId: z.string().min(1),
  id: z.string().min(1).optional(),
  labels: z.array(z.string()).optional(),
  referenceRecipeId: z.string().min(1).optional(),
  title: z
    .string()
    .refine((value) => value.trim().length > 0, "A section title is required."),
  directions: z.string(),
  ingredients: z.array(ingredientDraftSchema),
});

export type SectionDraft = z.infer<typeof sectionDraftSchema>;

export function newSectionDraft(): SectionDraft {
  return {
    clientId: crypto.randomUUID(),
    title: "",
    directions: "",
    ingredients: [newIngredientDraft()],
  };
}

/** I return a draft that refers to `section`, keeping it owned elsewhere. */
export function borrowedSectionDraft(section: BorrowableSection): SectionDraft {
  return {
    clientId: crypto.randomUUID(),
    id: section.id,
    referenceRecipeId: section.sectionOf.id,
    title: section.name,
    directions: "",
    ingredients: [],
  };
}
