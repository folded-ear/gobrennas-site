import { z } from "zod";
import { ingredientDraftSchema, newIngredientDraft } from "./ingredient-draft";

export const sectionDraftSchema = z.object({
  clientId: z.string().min(1),
  id: z.string().min(1).optional(),
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
